/**
 * Rebase Feature on Main Use Case
 *
 * Rebases a feature branch onto the latest main branch with auto-sync
 * and agent-powered conflict resolution.
 *
 * Flow: resolve feature → determine cwd (worktree or repo root) →
 * sync main → rebase → on conflict, delegate to ConflictResolutionService.
 */

import { injectable, inject } from 'tsyringe';
import type { IFeatureRepository } from '../../ports/output/repositories/feature-repository.interface.js';
import type { IGitPrService } from '../../ports/output/services/git-pr-service.interface.js';
import {
  GitPrError,
  GitPrErrorCode,
} from '../../ports/output/services/git-pr-service.interface.js';
import type { IWorktreeService } from '../../ports/output/services/worktree-service.interface.js';
import type { ConflictResolutionService } from '../../../infrastructure/services/agents/conflict-resolution/conflict-resolution.service.js';

@injectable()
export class RebaseFeatureOnMainUseCase {
  constructor(
    @inject('IFeatureRepository')
    private readonly featureRepo: IFeatureRepository,
    @inject('IGitPrService')
    private readonly gitPrService: IGitPrService,
    @inject('IWorktreeService')
    private readonly worktreeService: IWorktreeService,
    @inject('ConflictResolutionService')
    private readonly conflictResolutionService: ConflictResolutionService
  ) {}

  async execute(featureId: string): Promise<void> {
    // Resolve feature by exact ID or prefix
    const feature =
      (await this.featureRepo.findById(featureId)) ??
      (await this.featureRepo.findByIdPrefix(featureId));
    if (!feature) {
      throw new Error(`Feature not found: "${featureId}"`);
    }

    // Determine working directory — worktree path if it exists, else repo root
    const cwd = await this.resolveCwd(feature.repositoryPath, feature.branch);
    const defaultBranch = await this.gitPrService.getDefaultBranch(feature.repositoryPath);

    // Auto-sync main before rebasing (per spec decision)
    await this.gitPrService.syncMain(cwd, defaultBranch);

    // Attempt rebase
    try {
      await this.gitPrService.rebaseOnMain(cwd, feature.branch, defaultBranch);
    } catch (error) {
      if (error instanceof GitPrError && error.code === GitPrErrorCode.REBASE_CONFLICT) {
        // Delegate to agent-powered conflict resolution
        await this.conflictResolutionService.resolve(cwd, feature.branch, defaultBranch);
        return;
      }
      throw error;
    }
  }

  /**
   * Resolve the correct working directory for the feature.
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
