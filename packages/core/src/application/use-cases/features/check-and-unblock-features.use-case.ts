/**
 * CheckAndUnblockFeaturesUseCase
 *
 * Evaluates whether blocked direct children of a parent feature are now
 * eligible to start, and if so transitions them to Started and spawns their
 * agents.
 *
 * Business Rules:
 * - Only direct children of parentFeatureId are evaluated (no recursive traversal).
 *   Grandchildren stay Blocked until their own direct parent progresses.
 * - Gate: parent lifecycle must be in POST_IMPLEMENTATION (Implementation, Review, Maintain).
 * - Idempotent: already-Started children are not touched; calling execute() twice is safe.
 * - spawn() is skipped for children missing agentRunId or specPath (defensive guard).
 * - Auto-rebase: before spawning a child agent, rebases the child's branch onto
 *   the parent's branch so it starts from the latest parent state.
 *
 * Called from: UpdateFeatureLifecycleUseCase after every lifecycle transition.
 */

import { injectable, inject } from 'tsyringe';
import { SdlcLifecycle } from '../../../domain/generated/output.js';
import type { IFeatureRepository } from '../../ports/output/repositories/feature-repository.interface.js';
import type { IFeatureAgentProcessService } from '../../ports/output/agents/feature-agent-process.interface.js';
import type { IGitPrService } from '../../ports/output/services/git-pr-service.interface.js';
import type { IWorktreeService } from '../../ports/output/services/worktree-service.interface.js';
import { POST_IMPLEMENTATION } from '../../../domain/lifecycle-gates.js';

@injectable()
export class CheckAndUnblockFeaturesUseCase {
  constructor(
    @inject('IFeatureRepository') private readonly featureRepo: IFeatureRepository,
    @inject('IFeatureAgentProcessService')
    private readonly agentProcess: IFeatureAgentProcessService,
    @inject('IGitPrService')
    private readonly gitPrService: IGitPrService,
    @inject('IWorktreeService')
    private readonly worktreeService: IWorktreeService
  ) {}

  /**
   * Check and unblock direct children of the given parent feature.
   *
   * @param parentFeatureId - ID of the feature whose children should be evaluated.
   */
  async execute(parentFeatureId: string): Promise<void> {
    // Load parent and verify gate
    const parent = await this.featureRepo.findById(parentFeatureId);
    if (!parent || !POST_IMPLEMENTATION.has(parent.lifecycle)) {
      return;
    }

    // Load direct children
    const children = await this.featureRepo.findByParentId(parentFeatureId);

    // Unblock each blocked child
    for (const child of children) {
      if (child.lifecycle !== SdlcLifecycle.Blocked) {
        continue;
      }

      // Auto-rebase: rebase child branch onto parent's branch before starting.
      // Non-fatal — if rebase fails, the child still starts (agent can handle conflicts).
      if (parent.branch && child.branch) {
        try {
          const cwd = await this.resolveCwd(child.repositoryPath, child.branch);
          await this.gitPrService.rebaseOnMain(cwd, child.branch, parent.branch);
        } catch {
          // Rebase failure is non-fatal — the child agent can handle conflicts
        }
      }

      // Transition to Started
      child.lifecycle = SdlcLifecycle.Started;
      child.updatedAt = new Date();
      await this.featureRepo.update(child);

      // Spawn agent using fields set at feature creation time
      if (child.agentRunId && child.specPath) {
        this.agentProcess.spawn(
          child.id,
          child.agentRunId,
          child.repositoryPath,
          child.specPath,
          child.worktreePath,
          {
            approvalGates: child.approvalGates,
            push: child.push,
            openPr: child.openPr,
            forkAndPr: child.forkAndPr,
            commitSpecs: child.commitSpecs,
            ciWatchEnabled: child.ciWatchEnabled,
            enableEvidence: child.enableEvidence,
            commitEvidence: child.commitEvidence,
            ...(child.fast ? { fast: true } : {}),
          }
        );
      }
    }
  }

  /**
   * Resolve the correct working directory for a feature.
   * Uses the worktree path if a worktree exists for this branch,
   * otherwise falls back to the repository root.
   */
  private async resolveCwd(repositoryPath: string, branch: string): Promise<string> {
    const hasWorktree = await this.worktreeService.exists(repositoryPath, branch);
    if (hasWorktree) {
      return this.worktreeService.getWorktreePath(repositoryPath, branch);
    }
    return repositoryPath;
  }
}
