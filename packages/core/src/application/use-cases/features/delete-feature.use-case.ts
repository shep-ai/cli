/**
 * Delete Feature Use Case
 *
 * Orchestrates feature deletion including:
 * - Cancelling any running/pending agent runs
 * - Removing the git worktree
 * - Deleting the feature record
 *
 * Business Rules:
 * - Throws if the feature does not exist
 * - Cancels running/pending agent runs before deletion
 * - Gracefully handles worktree removal failures
 */

import { injectable, inject } from 'tsyringe';
import type { Feature } from '../../../domain/generated/output.js';
import { AgentRunStatus, SdlcLifecycle } from '../../../domain/generated/output.js';
import type { IFeatureRepository } from '../../ports/output/repositories/feature-repository.interface.js';
import type { IWorktreeService } from '../../ports/output/services/worktree-service.interface.js';
import type { IFeatureAgentProcessService } from '../../ports/output/agents/feature-agent-process.interface.js';
import type { IAgentRunRepository } from '../../ports/output/agents/agent-run-repository.interface.js';

@injectable()
export class DeleteFeatureUseCase {
  constructor(
    @inject('IFeatureRepository') private readonly featureRepo: IFeatureRepository,
    @inject('IWorktreeService') private readonly worktreeService: IWorktreeService,
    @inject('IFeatureAgentProcessService')
    private readonly processService: IFeatureAgentProcessService,
    @inject('IAgentRunRepository') private readonly runRepo: IAgentRunRepository
  ) {}

  async execute(featureId: string): Promise<Feature> {
    // 1. Find feature (exact or prefix match)
    const feature =
      (await this.featureRepo.findById(featureId)) ??
      (await this.featureRepo.findByIdPrefix(featureId));
    if (!feature) {
      throw new Error(`Feature not found: "${featureId}"`);
    }

    // 2. Guard: reject deletion if blocked children exist (FR-29)
    const blockedChildren = (await this.featureRepo.findByParentId(feature.id)).filter(
      (child) => child.lifecycle === SdlcLifecycle.Blocked
    );
    if (blockedChildren.length > 0) {
      const list = blockedChildren.map((c) => `${c.id} (${c.name})`).join(', ');
      throw new Error(
        `Cannot delete feature "${feature.name}" because it has blocked children: ${list}. ` +
          `Remove or re-parent the blocked children before deleting this feature.`
      );
    }

    // 3. Cancel running/pending agent run if present
    if (feature.agentRunId) {
      const run = await this.runRepo.findById(feature.agentRunId);
      if (run && (run.status === AgentRunStatus.running || run.status === AgentRunStatus.pending)) {
        // Kill the OS process if still alive
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

    // 4. Remove worktree (ignore errors if already removed)
    const worktreePath = this.worktreeService.getWorktreePath(
      feature.repositoryPath,
      feature.branch
    );
    try {
      await this.worktreeService.remove(worktreePath);
    } catch {
      // Worktree might already be removed - that's fine
    }

    // 5. Delete feature record
    await this.featureRepo.delete(feature.id);

    return feature;
  }
}
