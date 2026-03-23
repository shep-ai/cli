/**
 * Get Branch Sync Status Use Case
 *
 * Returns how many commits a feature branch is ahead/behind the base branch.
 *
 * Flow: resolve feature → determine cwd (worktree or repo root) →
 * sync remote tracking ref → get branch sync status.
 */

import { injectable, inject } from 'tsyringe';
import type { IFeatureRepository } from '../../ports/output/repositories/feature-repository.interface.js';
import type { IGitPrService } from '../../ports/output/services/git-pr-service.interface.js';
import type { IWorktreeService } from '../../ports/output/services/worktree-service.interface.js';

export interface BranchSyncStatusResult {
  ahead: number;
  behind: number;
  baseBranch: string;
}

@injectable()
export class GetBranchSyncStatusUseCase {
  constructor(
    @inject('IFeatureRepository')
    private readonly featureRepo: IFeatureRepository,
    @inject('IGitPrService')
    private readonly gitPrService: IGitPrService,
    @inject('IWorktreeService')
    private readonly worktreeService: IWorktreeService
  ) {}

  async execute(featureId: string): Promise<BranchSyncStatusResult> {
    const feature =
      (await this.featureRepo.findById(featureId)) ??
      (await this.featureRepo.findByIdPrefix(featureId));
    if (!feature) {
      throw new Error(`Feature not found: "${featureId}"`);
    }
    if (!feature.branch) {
      throw new Error(`Feature "${featureId}" has no branch`);
    }

    const cwd = await this.resolveCwd(feature.repositoryPath, feature.branch);
    const baseBranch = await this.gitPrService.getDefaultBranch(feature.repositoryPath);

    // Sync the remote tracking ref so ahead/behind counts are current
    await this.gitPrService.syncMain(cwd, baseBranch);

    const { ahead, behind } = await this.gitPrService.getBranchSyncStatus(
      cwd,
      feature.branch,
      baseBranch
    );

    return { ahead, behind, baseBranch };
  }

  private async resolveCwd(repositoryPath: string, branch: string): Promise<string> {
    const hasWorktree = await this.worktreeService.exists(repositoryPath, branch);
    if (hasWorktree) {
      return this.worktreeService.getWorktreePath(repositoryPath, branch);
    }
    return repositoryPath;
  }
}
