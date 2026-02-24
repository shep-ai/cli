/**
 * Merge Node — Agent-Driven Post-Implementation Merge Flow
 *
 * Handles the complete merge workflow after implementation using two agent calls:
 * 1. Commit + push + create PR (via agent executor)
 * 2. Merge/squash (via agent executor, after approval gate)
 *
 * Uses interrupt() for the merge approval gate when allowMerge=false.
 */

import { interrupt, isGraphBubbleUp } from '@langchain/langgraph';
import type { IAgentExecutor } from '@/application/ports/output/agents/agent-executor.interface.js';
import type { FeatureAgentState } from '../state.js';
import type { IFeatureRepository } from '@/application/ports/output/repositories/feature-repository.interface.js';
import type {
  DiffSummary,
  IGitPrService,
} from '@/application/ports/output/services/git-pr-service.interface.js';
import {
  GitPrError,
  GitPrErrorCode,
} from '@/application/ports/output/services/git-pr-service.interface.js';
import { SdlcLifecycle, PrStatus, CiStatus, type CiFixRecord } from '@/domain/generated/output.js';
import {
  createNodeLogger,
  shouldInterrupt,
  retryExecute,
  buildExecutorOptions,
  getCompletedPhases,
  clearCompletedPhase,
  markPhaseComplete,
} from './node-helpers.js';
import { reportNodeStart } from '../heartbeat.js';
import {
  recordPhaseStart,
  recordPhaseEnd,
  recordApprovalWaitStart,
} from '../phase-timing-context.js';
import { updateNodeLifecycle } from '../lifecycle-context.js';
import {
  buildCommitPushPrPrompt,
  buildMergeSquashPrompt,
  buildCiWatchFixPrompt,
} from './prompts/merge-prompts.js';
import { parseCommitHash, parsePrUrl } from './merge-output-parser.js';
import { getSettings } from '@/infrastructure/services/settings.service.js';

export interface MergeNodeDeps {
  executor: IAgentExecutor;
  getDiffSummary: (cwd: string, baseBranch: string) => Promise<DiffSummary>;
  hasRemote: (cwd: string) => Promise<boolean>;
  getDefaultBranch: (cwd: string) => Promise<string>;
  featureRepository: Pick<IFeatureRepository, 'findById' | 'update'>;
  /**
   * Verify that featureBranch has been merged into baseBranch.
   * Returns true if baseBranch contains all commits from featureBranch.
   */
  verifyMerge: (cwd: string, featureBranch: string, baseBranch: string) => Promise<boolean>;
  gitPrService: IGitPrService;
}

/**
 * Extract the numeric GitHub Actions run ID from a run URL.
 * Example: https://github.com/org/repo/actions/runs/12345 → "12345"
 */
function extractRunId(runUrl: string): string | undefined {
  const match = runUrl.match(/\/runs\/(\d+)/);
  return match ? match[1] : undefined;
}

/**
 * Factory that creates the merge node function.
 *
 * @param deps - External dependencies injected by the graph factory
 * @returns A LangGraph node function
 */
export function createMergeNode(deps: MergeNodeDeps) {
  const log = createNodeLogger('merge');

  return async (state: FeatureAgentState): Promise<Partial<FeatureAgentState>> => {
    log.info('Starting merge flow');
    reportNodeStart('merge');
    await updateNodeLifecycle('merge');

    // --- Rejection detection on resume (same pattern as executeNode) ---
    // On resume after interrupt, check if merge was already completed.
    // Rejection: clear phase, schedule re-execution via conditional edge.
    // Approval: fall through to post-interrupt work (lifecycle update, optional merge/squash).
    const completedPhases = getCompletedPhases(state.specDir);
    const isResumeAfterInterrupt =
      completedPhases.includes('merge') && shouldInterrupt('merge', state.approvalGates);

    if (isResumeAfterInterrupt && state._approvalAction === 'rejected') {
      const feedback = state._rejectionFeedback ?? '(no feedback)';
      log.info(`Merge rejected with feedback: "${feedback}" — scheduling re-execution`);
      clearCompletedPhase(state.specDir, 'merge', log);
      return {
        currentNode: 'merge',
        messages: [`[merge] Rejected — will re-execute`],
        _approvalAction: null,
        _rejectionFeedback: null,
        _needsReexecution: true,
      };
    }

    const messages: string[] = [];
    const startTime = Date.now();

    // Record merge phase timing
    const mergeTimingId = await recordPhaseStart('merge');

    try {
      const { executor } = deps;
      const cwd = state.worktreePath;

      // Resolve branch name from feature
      const feature = await deps.featureRepository.findById(state.featureId);
      const branch = feature?.branch ?? `feat/${state.featureId}`;
      const baseBranch = await deps.getDefaultBranch(cwd);
      const options = buildExecutorOptions(state);

      let commitHash = state.commitHash;
      let prUrl = state.prUrl;
      let prNumber = state.prNumber;
      let ciStatus = state.ciStatus;

      // Accumulated CI fix loop state (returned in state update)
      let ciFixAttempts = state.ciFixAttempts ?? 0;
      const newCiFixHistory: CiFixRecord[] = [];
      let ciFixStatus = state.ciFixStatus ?? 'idle';

      // --- Check for git remote (needed by both agent calls) ---
      const remoteAvailable = await deps.hasRemote(cwd);

      // --- Agent Call 1: Commit + Push + PR (skip on approval resume) ---
      if (!isResumeAfterInterrupt) {
        if (!remoteAvailable) {
          log.info('No git remote configured — skipping push and PR, will merge locally');
        }

        // Override push/openPr when no remote is available
        const effectiveState = remoteAvailable ? state : { ...state, push: false, openPr: false };

        log.info('Agent call 1: commit + push + PR');
        const commitPushPrPrompt = buildCommitPushPrPrompt(effectiveState, branch, baseBranch);
        const commitResult = await retryExecute(executor, commitPushPrPrompt, options, {
          logger: log,
        });

        // Parse structured data from agent output
        commitHash = parseCommitHash(commitResult.result) ?? state.commitHash;
        messages.push(`[merge] Agent completed commit/push/PR operations`);

        if (effectiveState.openPr) {
          const prResult = parsePrUrl(commitResult.result);
          if (prResult) {
            prUrl = prResult.url;
            prNumber = prResult.number;
            messages.push(`[merge] PR created: ${prUrl}`);
          }
        }

        // --- CI watch/fix loop (when push or openPr is enabled) ---
        if (effectiveState.push || effectiveState.openPr) {
          const settings = getSettings();
          const maxAttempts = settings.workflow?.ciMaxFixAttempts ?? 3;
          const timeoutMs = settings.workflow?.ciWatchTimeoutMs ?? 600_000;
          const logMaxChars = settings.workflow?.ciLogMaxChars ?? 50_000;

          log.info(`Starting CI watch (maxAttempts=${maxAttempts}, timeout=${timeoutMs}ms)`);

          // Check if any CI run exists for this branch
          const initialCiStatus = await deps.gitPrService.getCiStatus(cwd, branch);
          if (!initialCiStatus.runUrl) {
            log.info('No CI run detected after push — skipping CI watch');
          } else {
            let runUrl = initialCiStatus.runUrl;

            // Initial CI watch
            let watchResult;
            try {
              watchResult = await deps.gitPrService.watchCi(cwd, branch, timeoutMs);
            } catch (err) {
              if (err instanceof GitPrError && err.code === GitPrErrorCode.CI_TIMEOUT) {
                log.info('Initial CI watch timed out');
                newCiFixHistory.push({
                  attempt: ciFixAttempts + 1,
                  startedAt: new Date().toISOString(),
                  failureSummary: 'CI watch timed out',
                  outcome: 'timeout',
                });
                await handleCiTerminalFailure(
                  feature,
                  prUrl,
                  prNumber,
                  deps.featureRepository,
                  messages
                );
                throw buildCiExhaustedError(ciFixAttempts + 1, newCiFixHistory, 'timeout');
              }
              throw err;
            }

            if (watchResult.status === 'success') {
              log.info('CI passed on first watch');
              ciFixStatus = 'success';
              ciStatus = CiStatus.Success;
            } else {
              // CI failed — enter fix loop

              while (true) {
                // Fail-fast: check attempt count BEFORE invoking executor (NFR-3)
                if (ciFixAttempts >= maxAttempts) {
                  log.info(`CI fix loop exhausted after ${ciFixAttempts} attempt(s)`);
                  ciFixStatus = 'exhausted';
                  break;
                }

                // Fetch failure logs
                const runId = extractRunId(runUrl) ?? '';
                const failureLogs = await deps.gitPrService.getFailureLogs(
                  runId,
                  branch,
                  logMaxChars
                );
                const startedAt = new Date().toISOString();

                log.info(`CI fix attempt ${ciFixAttempts + 1}/${maxAttempts} for run ${runId}`);

                // Invoke fix executor
                const fixPrompt = buildCiWatchFixPrompt(
                  failureLogs,
                  ciFixAttempts + 1,
                  maxAttempts,
                  branch
                );
                await retryExecute(executor, fixPrompt, options, { logger: log });
                ciFixAttempts++;

                // Get updated run URL (new run triggered by push in fix)
                const updatedCiStatus = await deps.gitPrService.getCiStatus(cwd, branch);
                if (updatedCiStatus.runUrl) runUrl = updatedCiStatus.runUrl;

                // Watch CI after fix
                let fixWatchResult;
                try {
                  fixWatchResult = await deps.gitPrService.watchCi(cwd, branch, timeoutMs);
                } catch (err) {
                  if (err instanceof GitPrError && err.code === GitPrErrorCode.CI_TIMEOUT) {
                    log.info(`CI watch timed out during fix attempt ${ciFixAttempts}`);
                    newCiFixHistory.push({
                      attempt: ciFixAttempts,
                      startedAt,
                      failureSummary: failureLogs.slice(0, 500),
                      outcome: 'timeout',
                    });
                    ciFixStatus = 'timeout';
                    break;
                  }
                  throw err;
                }

                const outcome = fixWatchResult.status === 'success' ? 'fixed' : 'failed';
                newCiFixHistory.push({
                  attempt: ciFixAttempts,
                  startedAt,
                  failureSummary: failureLogs.slice(0, 500),
                  outcome,
                });

                if (fixWatchResult.status === 'success') {
                  log.info(`CI passed after fix attempt ${ciFixAttempts}`);
                  ciFixStatus = 'success';
                  ciStatus = CiStatus.Success;
                  break;
                }

                log.info(`CI still failing after fix attempt ${ciFixAttempts}`);
                messages.push(
                  `[merge] CI fix attempt ${ciFixAttempts}/${maxAttempts} — still failing`
                );
              }

              // Handle terminal failure states
              if (ciFixStatus === 'exhausted' || ciFixStatus === 'timeout') {
                await handleCiTerminalFailure(
                  feature,
                  prUrl,
                  prNumber,
                  deps.featureRepository,
                  messages
                );
                throw buildCiExhaustedError(ciFixAttempts, newCiFixHistory, ciFixStatus);
              }
            }
          }
        }

        // --- Merge approval gate ---
        if (shouldInterrupt('merge', state.approvalGates)) {
          log.info('Interrupting for merge approval');
          markPhaseComplete(state.specDir, 'merge', log);
          await recordPhaseEnd(mergeTimingId, Date.now() - startTime);
          await recordApprovalWaitStart(mergeTimingId);
          const diffSummary = await deps.getDiffSummary(cwd, baseBranch);
          interrupt({
            node: 'merge',
            message: 'Merge approval required. Review the changes and approve to continue.',
            diffSummary,
            prUrl,
            prNumber,
            ciStatus,
          });
        }
      } else {
        log.info('Merge approved — skipping commit/push/PR, continuing to post-merge');
        messages.push(`[merge] Approved — continuing`);
      }

      // --- Agent Call 2: Merge (if enabled) ---
      let merged = false;
      if (state.approvalGates?.allowMerge) {
        log.info('Agent call 2: merge/squash');
        const mergePrompt = buildMergeSquashPrompt(
          { ...state, prUrl, prNumber, commitHash },
          branch,
          baseBranch,
          remoteAvailable
        );
        // Run merge in the ORIGINAL repo, not the worktree — the worktree IS
        // the feature branch and must not be modified or removed during merge.
        const mergeOptions = { ...options, cwd: state.repositoryPath };
        await retryExecute(executor, mergePrompt, mergeOptions, { logger: log });

        // Verify the merge actually succeeded (agent may report success without merging)
        if (!prUrl) {
          const mergeVerified = await deps.verifyMerge(state.repositoryPath, branch, baseBranch);
          if (!mergeVerified) {
            throw new Error(
              `Merge verification failed: ${branch} was not merged into ${baseBranch}. ` +
                `The agent may have encountered errors during the merge operation.`
            );
          }
          log.info('Merge verified: feature branch is ancestor of base branch');
        }

        messages.push(`[merge] Agent completed merge operation`);
        merged = true;
      }

      // --- Update feature lifecycle ---
      const newLifecycle = merged ? SdlcLifecycle.Maintain : SdlcLifecycle.Review;
      if (feature) {
        await deps.featureRepository.update({
          ...feature,
          lifecycle: newLifecycle,
          ...(prUrl && prNumber
            ? {
                pr: {
                  url: prUrl,
                  number: prNumber,
                  status: merged ? PrStatus.Merged : PrStatus.Open,
                  ...(commitHash ? { commitHash } : {}),
                  ...(ciStatus ? { ciStatus: ciStatus as CiStatus } : {}),
                },
              }
            : {}),
          updatedAt: new Date(),
        });
        messages.push(`[merge] Feature lifecycle → ${newLifecycle}`);
      }

      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      await recordPhaseEnd(mergeTimingId, Date.now() - startTime);
      messages.push(`[merge] Complete (${elapsed}s)`);
      log.info(`Merge flow complete (${elapsed}s)`);

      return {
        currentNode: 'merge',
        messages,
        commitHash,
        prUrl,
        prNumber,
        ciStatus,
        ciFixAttempts,
        ciFixHistory: newCiFixHistory,
        ciFixStatus,
        _approvalAction: null,
        _rejectionFeedback: null,
        _needsReexecution: false,
      };
    } catch (err: unknown) {
      // Re-throw LangGraph control-flow exceptions (interrupt, etc.)
      if (isGraphBubbleUp(err)) throw err;

      const message = err instanceof Error ? err.message : String(err);
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      log.error(`Merge failed: ${message} (${elapsed}s)`);

      // Record phase end even on failure so timing shows duration, not "running"
      await recordPhaseEnd(mergeTimingId, Date.now() - startTime);

      // Re-throw so LangGraph does NOT checkpoint this node as completed.
      throw err;
    }
  };
}

/**
 * Update the feature repository to mark CI as failed before throwing.
 */
async function handleCiTerminalFailure(
  feature: Awaited<ReturnType<Pick<IFeatureRepository, 'findById'>['findById']>>,
  prUrl: string | null,
  prNumber: number | null,
  featureRepository: Pick<IFeatureRepository, 'findById' | 'update'>,
  messages: string[]
): Promise<void> {
  if (feature && prUrl && prNumber) {
    await featureRepository.update({
      ...feature,
      lifecycle: feature.lifecycle,
      pr: {
        url: prUrl,
        number: prNumber,
        status: PrStatus.Open,
        ciStatus: CiStatus.Failure,
      },
      updatedAt: new Date(),
    });
  }
  messages.push(`[merge] CI watch/fix loop failed — feature halted`);
}

/**
 * Build a structured error message describing the CI fix loop outcome.
 */
function buildCiExhaustedError(
  attempts: number,
  history: CiFixRecord[],
  reason: 'exhausted' | 'timeout'
): Error {
  const reasonStr =
    reason === 'timeout' ? 'CI watch timed out' : `all ${attempts} fix attempt(s) exhausted`;
  const historyStr = history
    .map((r) => `  - Attempt ${r.attempt}: ${r.outcome} (started ${r.startedAt})`)
    .join('\n');
  const detail = historyStr ? `\nAttempt history:\n${historyStr}` : '';
  return new Error(
    `CI watch/fix loop failed — ${reasonStr}.${detail}\nReview CI logs and fix manually.`
  );
}
