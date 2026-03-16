/**
 * Rebase Feature Use Case
 *
 * Rebases a feature branch on top of the current main branch.
 * When the repository is a fork, syncs local main with upstream first.
 * On conflict, aborts cleanly and surfaces a GitPrError with REBASE_CONFLICT.
 */

import { injectable, inject } from 'tsyringe';
import type { IFeatureRepository } from '../../ports/output/repositories/feature-repository.interface.js';
import type { IGitPrService } from '../../ports/output/services/git-pr-service.interface.js';

export interface RebaseFeatureResult {
  success: boolean;
  branch: string;
  rebased: boolean;
}

@injectable()
export class RebaseFeatureUseCase {
  constructor(
    @inject('IFeatureRepository')
    private readonly featureRepo: IFeatureRepository,
    @inject('IGitPrService')
    private readonly gitPrService: IGitPrService
  ) {}

  async execute(featureId: string): Promise<RebaseFeatureResult> {
    const feature =
      (await this.featureRepo.findById(featureId)) ??
      (await this.featureRepo.findByIdPrefix(featureId));

    if (!feature) {
      throw new Error(`Feature not found: ${featureId}`);
    }

    if (!feature.worktreePath) {
      throw new Error(
        `Feature "${feature.name}" has no worktreePath. The worktree must be initialized before rebasing.`
      );
    }

    const cwd = feature.worktreePath;
    const repoRoot = feature.repositoryPath;

    const { isFork, upstreamUrl } = await this.gitPrService.isFork(repoRoot);

    if (isFork) {
      await this.gitPrService.ensureUpstreamRemote(cwd, upstreamUrl!);
      await this.gitPrService.syncForkMain(cwd);
    }

    await this.gitPrService.rebase(cwd, feature.branch, 'main');

    return {
      success: true,
      branch: feature.branch,
      rebased: true,
    };
  }
}
