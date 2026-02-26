/**
 * Cleanup Feature Worktree Use Case
 *
 * Orchestrates post-merge cleanup after a feature reaches SdlcLifecycle.Maintain:
 * - Unlinks the git worktree (preserving directory contents on disk)
 * - Deletes the local feature branch
 * - Deletes the remote feature branch (if it still exists)
 *
 * All cleanup steps are non-fatal: errors are caught and logged as warnings
 * so that a cleanup failure never surfaces as a feature run failure.
 */

import { injectable, inject } from 'tsyringe';
import type { IFeatureRepository } from '../../ports/output/repositories/feature-repository.interface.js';
import type { IWorktreeService } from '../../ports/output/services/worktree-service.interface.js';
import type { IGitPrService } from '../../ports/output/services/git-pr-service.interface.js';

@injectable()
export class CleanupFeatureWorktreeUseCase {
  constructor(
    @inject('IFeatureRepository') private readonly featureRepo: IFeatureRepository,
    @inject('IWorktreeService') private readonly worktreeService: IWorktreeService,
    @inject('IGitPrService') private readonly gitPrService: IGitPrService
  ) {}

  async execute(featureId: string): Promise<void> {
    const feature = await this.featureRepo.findById(featureId);
    if (!feature) return;

    // Step 1: Unlink the git worktree (directory contents are preserved on disk)
    if (feature.worktreePath) {
      try {
        await this.worktreeService.remove(feature.worktreePath, true);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn('[CleanupFeatureWorktreeUseCase] worktree remove failed:', err);
      }
    }

    // Step 2: Delete the local feature branch
    try {
      await this.gitPrService.deleteBranch(feature.repositoryPath, feature.branch);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('[CleanupFeatureWorktreeUseCase] local branch delete failed:', err);
    }

    // Step 3: Delete the remote feature branch if it still exists
    try {
      const remoteExists = await this.worktreeService.remoteBranchExists(
        feature.repositoryPath,
        feature.branch
      );
      if (remoteExists) {
        await this.gitPrService.deleteBranch(feature.repositoryPath, feature.branch, true);
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('[CleanupFeatureWorktreeUseCase] remote branch delete failed:', err);
    }
  }
}
