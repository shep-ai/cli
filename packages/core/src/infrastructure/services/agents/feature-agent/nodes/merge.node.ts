/**
 * Merge Node — Post-Implementation Merge Flow
 *
 * Handles the complete merge workflow after implementation:
 * 1. Commit uncommitted changes and push
 * 2. Generate pr.yaml (always) and optionally create PR
 * 3. Optionally auto-merge (via PR or direct branch merge)
 * 4. Update feature lifecycle and clean up
 *
 * Uses interrupt() for the merge approval gate when allowMerge=false.
 */

import { interrupt, isGraphBubbleUp } from '@langchain/langgraph';
import type { FeatureAgentState } from '../state.js';
import type { IGitPrService } from '@/application/ports/output/services/git-pr-service.interface.js';
import type { IFeatureRepository } from '@/application/ports/output/repositories/feature-repository.interface.js';
import { SdlcLifecycle, PrStatus, type CiStatus } from '@/domain/generated/output.js';
import { createNodeLogger, shouldInterrupt } from './node-helpers.js';
import { reportNodeStart } from '../heartbeat.js';

export interface MergeNodeDeps {
  gitPrService: IGitPrService;
  generatePrYaml: (specDir: string, branch: string, baseBranch: string) => string;
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
    const messages: string[] = [];
    const startTime = Date.now();

    try {
      const { gitPrService } = deps;
      const cwd = state.worktreePath;

      // Resolve branch name from feature
      const feature = await deps.featureRepository.findById(state.featureId);
      const branch = feature?.branch ?? `feat/${state.featureId}`;
      const baseBranch = 'main';

      // --- Step 1: Commit and Push ---
      let commitHash = state.commitHash;

      const hasChanges = await gitPrService.hasUncommittedChanges(cwd);
      if (hasChanges) {
        log.info('Uncommitted changes detected, committing...');
        commitHash = await gitPrService.commitAll(
          cwd,
          `feat: implementation complete for ${state.featureId}`
        );
        messages.push(`[merge] Committed changes: ${commitHash}`);
      } else {
        log.info('No uncommitted changes');
        messages.push('[merge] No uncommitted changes to commit');
      }

      // Push is controlled by the push flag (--push, or implied by --pr)
      const shouldPush = state.push || state.openPr;
      if (shouldPush) {
        log.info('Pushing to remote...');
        await gitPrService.push(cwd, branch, true);
        messages.push(`[merge] Pushed branch ${branch}`);
      } else {
        log.info('Push skipped (--push not set)');
        messages.push('[merge] Push skipped (use --push to push to remote)');
      }

      // --- Step 2: Generate pr.yaml (always) ---
      log.info('Generating pr.yaml...');
      const prYamlPath = deps.generatePrYaml(state.specDir, branch, baseBranch);
      messages.push(`[merge] Generated pr.yaml at ${prYamlPath}`);

      // --- Step 3: Create PR (if openPr=true and not already created) ---
      let prUrl = state.prUrl;
      let prNumber = state.prNumber;
      let ciStatus = state.ciStatus;

      if (state.openPr && !state.prUrl) {
        log.info('Creating pull request...');
        const prResult = await gitPrService.createPr(cwd, prYamlPath);
        prUrl = prResult.url;
        prNumber = prResult.number;
        messages.push(`[merge] PR created: ${prUrl}`);

        // Watch CI if we're going to auto-merge
        if (state.autoMerge) {
          log.info('Watching CI...');
          const ciResult = await gitPrService.watchCi(cwd, branch);
          ciStatus = ciResult.status;
          messages.push(`[merge] CI status: ${ciStatus}`);
        }
      }

      // --- Step 4: Merge approval gate ---
      if (shouldInterrupt('merge', state.approvalGates, state.autoMerge)) {
        log.info('Interrupting for merge approval');
        const diffSummary = await gitPrService.getPrDiffSummary(cwd, baseBranch);
        interrupt({
          node: 'merge',
          message: 'Merge approval required. Review the changes and approve to continue.',
          diffSummary,
          prUrl,
          prNumber,
        });
      }

      // --- Step 5: Auto-merge (if enabled) ---
      let merged = false;
      if (state.autoMerge) {
        if (state.openPr && prNumber) {
          log.info(`Auto-merging PR #${prNumber}...`);
          await gitPrService.mergePr(cwd, prNumber, 'squash');
          messages.push(`[merge] PR #${prNumber} merged via squash`);
          merged = true;
        } else {
          log.info(`Auto-merging branch ${branch} into ${baseBranch}...`);
          await gitPrService.mergeBranch(cwd, branch, baseBranch);
          messages.push(`[merge] Branch ${branch} merged into ${baseBranch}`);
          merged = true;
        }
      }

      // --- Step 6: Update feature lifecycle ---
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
      messages.push(`[merge] Complete (${elapsed}s)`);
      log.info(`Merge flow complete (${elapsed}s)`);

      return {
        currentNode: 'merge',
        messages,
        commitHash,
        prUrl,
        prNumber,
        ciStatus,
      };
    } catch (err: unknown) {
      // Re-throw LangGraph control-flow exceptions (interrupt, etc.)
      if (isGraphBubbleUp(err)) throw err;

      const message = err instanceof Error ? err.message : String(err);
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      log.error(`Merge failed: ${message} (${elapsed}s)`);

      // Re-throw so LangGraph does NOT checkpoint this node as completed.
      // This allows `feat resume` to retry the merge node instead of
      // restarting the entire graph from scratch.
      throw err;
    }
  };
}
