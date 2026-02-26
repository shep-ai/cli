/**
 * SlugResolver
 *
 * Resolves unique slugs by checking against database and git branches.
 * On collision, appends a short random suffix to guarantee uniqueness
 * without arbitrary iteration limits.
 */

import { randomBytes } from 'node:crypto';
import { injectable, inject } from 'tsyringe';
import type { IFeatureRepository } from '../../../ports/output/repositories/feature-repository.interface.js';
import type { IWorktreeService } from '../../../ports/output/services/worktree-service.interface.js';

export interface SlugResolutionResult {
  slug: string;
  branch: string;
  warning?: string;
}

@injectable()
export class SlugResolver {
  constructor(
    @inject('IFeatureRepository')
    private readonly featureRepo: IFeatureRepository,
    @inject('IWorktreeService')
    private readonly worktreeService: IWorktreeService
  ) {}

  /**
   * Find a unique slug by checking the feature DB, local branches, and remote branches.
   * If the original slug conflicts, appends a short random hex suffix (e.g., -a3f1).
   */
  async resolveUniqueSlug(
    originalSlug: string,
    repositoryPath: string
  ): Promise<SlugResolutionResult> {
    // First try the original slug as-is
    if (await this.isSlugAvailable(originalSlug, repositoryPath)) {
      return { slug: originalSlug, branch: `feat/${originalSlug}` };
    }

    // Collision — generate a random suffix
    const suffix = randomBytes(3).toString('hex'); // 6 hex chars, e.g. "a3f1b2"
    const slug = `${originalSlug}-${suffix}`;
    const branch = `feat/${slug}`;

    return {
      slug,
      branch,
      warning: `Branch "feat/${originalSlug}" already exists, using "${branch}" instead`,
    };
  }

  private async isSlugAvailable(slug: string, repositoryPath: string): Promise<boolean> {
    const branch = `feat/${slug}`;

    // Check if a feature with this slug already exists in the DB
    const existing = await this.featureRepo.findBySlug(slug, repositoryPath);
    if (existing) return false;

    // Check if the git branch already exists (worktree, local, or remote)
    const branchInUse = await this.worktreeService.exists(repositoryPath, branch);
    if (branchInUse) return false;

    const branchExists = await this.worktreeService.branchExists(repositoryPath, branch);
    if (branchExists) return false;

    const remoteBranchExists = await this.worktreeService.remoteBranchExists(
      repositoryPath,
      branch
    );
    if (remoteBranchExists) return false;

    return true;
  }
}
