/**
 * Delete Feature Use Case
 *
 * Orchestrates feature deletion including:
 * - Cascade deleting all sub-features (children, grandchildren, etc.)
 * - Cancelling any running/pending agent runs
 * - Removing the git worktree
 * - Deleting the feature record
 *
 * Business Rules:
 * - Throws if the feature does not exist
 * - Cascade deletes all sub-features before deleting the parent
 * - Cancels running/pending agent runs before deletion
 * - Gracefully handles worktree removal failures
 */

import { injectable, inject } from 'tsyringe';
import type { Feature } from '../../../domain/generated/output.js';
import { AgentRunStatus } from '../../../domain/generated/output.js';
import type { IFeatureRepository } from '../../ports/output/repositories/feature-repository.interface.js';
import type { IWorktreeService } from '../../ports/output/services/worktree-service.interface.js';
import type { IFeatureAgentProcessService } from '../../ports/output/agents/feature-agent-process.interface.js';
import type { IAgentRunRepository } from '../../ports/output/agents/agent-run-repository.interface.js';
import type { CleanupFeatureWorktreeUseCase } from './cleanup-feature-worktree.use-case.js';

export interface DeleteFeatureOptions {
  cleanup?: boolean;
}

@injectable()
export class DeleteFeatureUseCase {
  constructor(
    @inject('IFeatureRepository') private readonly featureRepo: IFeatureRepository,
    @inject('IWorktreeService') private readonly worktreeService: IWorktreeService,
    @inject('IFeatureAgentProcessService')
    private readonly processService: IFeatureAgentProcessService,
    @inject('IAgentRunRepository') private readonly runRepo: IAgentRunRepository,
    @inject('CleanupFeatureWorktreeUseCase')
    private readonly cleanupUseCase: Pick<CleanupFeatureWorktreeUseCase, 'execute'>
  ) {}

  async execute(featureId: string, options?: DeleteFeatureOptions): Promise<Feature> {
    // 1. Find feature (exact or prefix match)
    const feature =
      (await this.featureRepo.findById(featureId)) ??
      (await this.featureRepo.findByIdPrefix(featureId));
    if (!feature) {
      throw new Error(`Feature not found: "${featureId}"`);
    }

    // 2. Cascade delete all sub-features (depth-first)
    await this.cascadeDeleteChildren(feature.id);

    // 3. Delete the feature itself
    await this.deleteSingleFeature(feature);

    return feature;
  }

  private async cascadeDeleteChildren(parentId: string): Promise<void> {
    const children = await this.featureRepo.findByParentId(parentId);
    for (const child of children) {
      // Recurse into grandchildren first (depth-first)
      await this.cascadeDeleteChildren(child.id);
      await this.deleteSingleFeature(child);
    }
  }

  private async deleteSingleFeature(feature: Feature): Promise<void> {
    // Cancel running/pending agent run if present
    if (feature.agentRunId) {
      const run = await this.runRepo.findById(feature.agentRunId);
      if (run && (run.status === AgentRunStatus.running || run.status === AgentRunStatus.pending)) {
        if (run.pid && this.processService.isAlive(run.pid)) {
          try {
            process.kill(run.pid);
          } catch {
            // Process may have already exited
          }
        }
        await this.runRepo.updateStatus(run.id, AgentRunStatus.cancelled);
      }
    }

    // 4. Cleanup: either full cleanup (worktree + branches) or just worktree removal
    const cleanup = options?.cleanup !== false;
    if (cleanup) {
      try {
        await this.cleanupUseCase.execute(feature.id);
      } catch {
        // Cleanup is best-effort — don't block deletion
      }
    } else {
      const worktreePath = this.worktreeService.getWorktreePath(
        feature.repositoryPath,
        feature.branch
      );
      try {
        await this.worktreeService.remove(worktreePath);
      } catch {
        // Worktree might already be removed - that's fine
      }
    }

    // Delete feature record
    await this.featureRepo.delete(feature.id);
  }
}
