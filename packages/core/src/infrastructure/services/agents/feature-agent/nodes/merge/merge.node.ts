/**
 * Merge Node — Agent-Driven Post-Implementation Merge Flow
 *
 * Handles the complete merge workflow after implementation using two agent calls:
 * 1. Commit + push + create PR (via agent executor)
 * 2. Merge/squash (via agent executor, after approval gate)
 *
 * Uses interrupt() for the merge approval gate when allowMerge=false.
 *
 * Sub-modules:
 * - ci-watch-fix-loop.ts: CI watch + automatic fix loop
 * - ci-helpers.ts: shared CI utility functions
 * - merge-output-parser.ts: structured data extraction from agent output
 */

import { interrupt, isGraphBubbleUp } from '@langchain/langgraph';
import type { IAgentExecutor } from '@/application/ports/output/agents/agent-executor.interface.js';
import type { FeatureAgentState } from '../../state.js';
import type { IFeatureRepository } from '@/application/ports/output/repositories/feature-repository.interface.js';
import type {
  DiffSummary,
  IGitPrService,
} from '@/application/ports/output/services/git-pr-service.interface.js';
import { SdlcLifecycle, PrStatus, type CiStatus } from '@/domain/generated/output.js';
import {
  createNodeLogger,
  shouldInterrupt,
  retryExecute,
  buildExecutorOptions,
  getCompletedPhases,
  clearCompletedPhase,
  markPhaseComplete,
} from '../node-helpers.js';
import { reportNodeStart } from '../../heartbeat.js';
import {
  recordPhaseStart,
  recordPhaseEnd,
  recordApprovalWaitStart,
} from '../../phase-timing-context.js';
import { updateNodeLifecycle } from '../../lifecycle-context.js';
import { buildCommitPushPrPrompt, buildMergeSquashPrompt } from '../prompts/merge-prompts.js';
import { parseCommitHash, parsePrUrl } from './merge-output-parser.js';
import { runCiWatchFixLoop } from './ci-watch-fix-loop.js';
import { EXECUTION_MONITOR_CONFIG_KEY, EXECUTION_STEP_ID_KEY } from '../../graph-middleware.js';
import type { ExecutionMonitor } from '../../execution-monitor.js';
import { ExecutionStepType } from '@/domain/generated/output.js';

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
 * Factory that creates the merge node function.
 *
 * @param deps - External dependencies injected by the graph factory
 * @returns A LangGraph node function
 */
export function createMergeNode(deps: MergeNodeDeps) {
  const log = createNodeLogger('merge');

  return async (
    state: FeatureAgentState,
    config?: Record<string, unknown>
  ): Promise<Partial<FeatureAgentState>> => {
    log.info('Starting merge flow');
    reportNodeStart('merge');
    await updateNodeLifecycle('merge');

    // Extract ExecutionMonitor and parent step ID from config (injected by graph middleware)
    const configurable = (config?.configurable as Record<string, unknown>) ?? {};
    const monitor = configurable[EXECUTION_MONITOR_CONFIG_KEY] as ExecutionMonitor | undefined;
    const parentStepId = configurable[EXECUTION_STEP_ID_KEY] as string | undefined;

    // --- Rejection detection on resume (same pattern as executeNode) ---
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
    const mergeTimingId = await recordPhaseStart('merge');

    try {
      const { executor } = deps;
      const cwd = state.worktreePath;

      const feature = await deps.featureRepository.findById(state.featureId);
      const branch = feature?.branch ?? `feat/${state.featureId}`;
      const baseBranch = await deps.getDefaultBranch(cwd);
      const options = buildExecutorOptions(state);

      let commitHash = state.commitHash;
      let prUrl = state.prUrl;
      let prNumber = state.prNumber;
      let ciStatus = state.ciStatus;

      let ciFixAttempts = state.ciFixAttempts ?? 0;
      let ciFixHistory = state.ciFixHistory ?? [];
      let ciFixStatus = state.ciFixStatus ?? 'idle';

      // --- Check for git remote (needed by both agent calls) ---
      const remoteAvailable = await deps.hasRemote(cwd);

      // --- Agent Call 1: Commit + Push + PR (skip on approval resume) ---
      if (!isResumeAfterInterrupt) {
        if (!remoteAvailable) {
          log.info('No git remote configured — skipping push and PR, will merge locally');
        }

        const effectiveState = remoteAvailable ? state : { ...state, push: false, openPr: false };

        log.info('Agent call 1: commit + push + PR');
        const commitPushPrStepId =
          monitor && parentStepId
            ? await monitor.startSubStep(parentStepId, 'commit-push-pr', ExecutionStepType.subStep)
            : null;
        const commitPushPrPrompt = buildCommitPushPrPrompt(effectiveState, branch, baseBranch);
        const commitResult = await retryExecute(executor, commitPushPrPrompt, options, {
          logger: log,
        });

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
        if (commitPushPrStepId && monitor) {
          await monitor.completeStep(commitPushPrStepId, 'success', {
            commitHash,
            prUrl,
            prNumber,
          });
        }

        // --- CI watch/fix loop (when push or openPr is enabled) ---
        if (effectiveState.push || effectiveState.openPr) {
          const ciResult = await runCiWatchFixLoop(
            {
              executor,
              gitPrService: deps.gitPrService,
              featureRepository: deps.featureRepository,
            },
            {
              cwd,
              branch,
              options,
              feature,
              prUrl,
              prNumber,
              existingAttempts: ciFixAttempts,
              messages,
              log,
              monitor: monitor ?? undefined,
              parentStepId: parentStepId ?? undefined,
            }
          );
          ciStatus = ciResult.ciStatus;
          ciFixAttempts = ciResult.ciFixAttempts;
          ciFixHistory = ciResult.ciFixHistory;
          ciFixStatus = ciResult.ciFixStatus;
        }

        // --- Persist PR data before approval gate so feat show displays it ---
        if (feature && prUrl && prNumber) {
          await deps.featureRepository.update({
            ...feature,
            pr: {
              url: prUrl,
              number: prNumber,
              status: PrStatus.Open,
              ...(commitHash ? { commitHash } : {}),
              ...(ciStatus ? { ciStatus: ciStatus as CiStatus } : {}),
              ...(ciFixAttempts > 0 ? { ciFixAttempts } : {}),
              ...(ciFixHistory.length > 0 ? { ciFixHistory } : {}),
            },
            updatedAt: new Date(),
          });
          log.info(`Persisted PR data (${prUrl}) to feature record`);
        }

        // --- Merge approval gate ---
        if (shouldInterrupt('merge', state.approvalGates)) {
          log.info('Interrupting for merge approval');
          markPhaseComplete(state.specDir, 'merge', log);
          await recordPhaseEnd(mergeTimingId, Date.now() - startTime);
          await recordApprovalWaitStart(mergeTimingId);
          // Record approval wait as a sub-step
          if (monitor && parentStepId) {
            await monitor.startSubStep(parentStepId, 'approval', ExecutionStepType.approvalWait);
          }
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

        // Restore PR data from feature record (persisted before interrupt, but
        // not returned in graph state because interrupt() threw before the return).
        if (feature?.pr) {
          prUrl = feature.pr.url ?? prUrl;
          prNumber = feature.pr.number ?? prNumber;
          commitHash = feature.pr.commitHash ?? commitHash;
          ciStatus = (feature.pr.ciStatus as string) ?? ciStatus;
        }
      }

      // --- Merge ---
      // Merge when: allowMerge is true (auto-merge), OR user explicitly
      // approved at the merge gate (isResumeAfterInterrupt means they
      // clicked Approve). The approval IS permission to merge.
      let merged = false;
      const userApprovedMerge = isResumeAfterInterrupt && state._approvalAction !== 'rejected';
      if (state.approvalGates?.allowMerge || userApprovedMerge) {
        if (prUrl && prNumber) {
          // PR exists: merge via GitHub API directly — no agent or local merge needed.
          log.info(`Merging PR #${prNumber} via GitHub API (squash)`);
          await deps.gitPrService.mergePr(cwd, prNumber, 'squash');
          messages.push(`[merge] PR #${prNumber} merged via squash`);
          merged = true;
        } else {
          // No PR: local merge via agent in the ORIGINAL repo (not the worktree,
          // which IS the feature branch and must not be modified during merge).
          log.info('Agent call: merge/squash (local, no PR)');
          const mergePrompt = buildMergeSquashPrompt(
            { ...state, prUrl, prNumber, commitHash },
            branch,
            baseBranch,
            remoteAvailable
          );
          const mergeOptions = { ...options, cwd: state.repositoryPath };
          await retryExecute(executor, mergePrompt, mergeOptions, { logger: log });

          // Verify the merge actually succeeded (agent may report success without merging)
          const mergeVerified = await deps.verifyMerge(state.repositoryPath, branch, baseBranch);
          if (!mergeVerified) {
            throw new Error(
              `Merge verification failed: ${branch} was not merged into ${baseBranch}. ` +
                `The agent may have encountered errors during the merge operation.`
            );
          }
          log.info('Merge verified: feature branch is ancestor of base branch');
          messages.push(`[merge] Agent completed local merge operation`);
          merged = true;
        }
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
                  ...(ciFixAttempts > 0 ? { ciFixAttempts } : {}),
                  ...(ciFixHistory.length > 0 ? { ciFixHistory } : {}),
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
        ciFixHistory,
        ciFixStatus,
        _approvalAction: null,
        _rejectionFeedback: null,
        _needsReexecution: false,
      };
    } catch (err: unknown) {
      if (isGraphBubbleUp(err)) throw err;

      const message = err instanceof Error ? err.message : String(err);
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      log.error(`Merge failed: ${message} (${elapsed}s)`);
      await recordPhaseEnd(mergeTimingId, Date.now() - startTime);
      throw err;
    }
  };
}
