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
import type { DiffSummary } from '@/application/ports/output/services/git-pr-service.interface.js';
import { SdlcLifecycle, PrStatus, type CiStatus } from '@/domain/generated/output.js';
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
import { buildCommitPushPrPrompt, buildMergeSquashPrompt } from './prompts/merge-prompts.js';
import { parseCommitHash, parsePrUrl } from './merge-output-parser.js';

export interface MergeNodeDeps {
  executor: IAgentExecutor;
  getDiffSummary: (cwd: string, baseBranch: string) => Promise<DiffSummary>;
  hasRemote: (cwd: string) => Promise<boolean>;
  getDefaultBranch: (cwd: string) => Promise<string>;
  featureRepository: Pick<IFeatureRepository, 'findById' | 'update'>;
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
      const ciStatus = state.ciStatus;

      // --- Agent Call 1: Commit + Push + PR (skip on approval resume) ---
      if (!isResumeAfterInterrupt) {
        // --- Check for git remote ---
        const remoteAvailable = await deps.hasRemote(cwd);
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
          baseBranch
        );
        await retryExecute(executor, mergePrompt, options, { logger: log });
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
