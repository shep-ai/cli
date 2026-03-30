/**
 * ResolveMergedFeaturesUseCase
 *
 * Checks features in the Review lifecycle to see if their branch has already
 * been merged into the repository's default branch. If so, transitions them
 * to Maintain (done) and completes the associated agent run.
 *
 * This resolves "action needed" features that are out of sync — the branch
 * was merged externally but the feature record was never updated.
 *
 * Called on first page load to catch stale Review features.
 */

import { injectable, inject } from 'tsyringe';
import { SdlcLifecycle, AgentRunStatus } from '../../../domain/generated/output.js';
import type { IFeatureRepository } from '../../ports/output/repositories/feature-repository.interface.js';
import type { IGitPrService } from '../../ports/output/services/git-pr-service.interface.js';
import type { IAgentRunRepository } from '../../ports/output/agents/agent-run-repository.interface.js';

@injectable()
export class ResolveMergedFeaturesUseCase {
  constructor(
    @inject('IFeatureRepository') private readonly featureRepo: IFeatureRepository,
    @inject('IGitPrService') private readonly gitPrService: IGitPrService,
    @inject('IAgentRunRepository') private readonly agentRunRepo: IAgentRunRepository
  ) {}

  /**
   * Scan all Review features and transition any whose branch has been merged.
   *
   * @returns Number of features resolved to Maintain.
   */
  async execute(): Promise<number> {
    const reviewFeatures = await this.featureRepo.list({
      lifecycle: SdlcLifecycle.Review,
    });

    let resolved = 0;

    for (const feature of reviewFeatures) {
      if (!feature.repositoryPath || !feature.branch) continue;

      try {
        // Check if the repo has a remote — verifyMerge needs remote refs
        const hasRemote = await this.gitPrService.hasRemote(feature.repositoryPath);
        if (!hasRemote) continue;

        const defaultBranch = await this.gitPrService.getDefaultBranch(feature.repositoryPath);

        // Sync remote refs so merge-base check uses latest state
        try {
          await this.gitPrService.syncMain(feature.repositoryPath, defaultBranch);
        } catch {
          // Sync failure is non-fatal — proceed with potentially stale refs
        }

        const isMerged = await this.gitPrService.verifyMerge(
          feature.repositoryPath,
          feature.branch,
          defaultBranch
        );

        if (isMerged) {
          feature.lifecycle = SdlcLifecycle.Maintain;
          feature.updatedAt = new Date();
          await this.featureRepo.update(feature);

          // Complete the associated agent run if one exists
          if (feature.agentRunId) {
            try {
              await this.agentRunRepo.updateStatus(feature.agentRunId, AgentRunStatus.completed);
            } catch {
              // Non-fatal — feature lifecycle is already updated
            }
          }

          resolved++;
        }
      } catch {
        // Skip features where git operations fail (repo deleted, etc.)
        continue;
      }
    }

    return resolved;
  }
}
