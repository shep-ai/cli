/**
 * SlugResolver
 *
 * Resolves unique slugs by checking against database and git branches.
 * Ensures no slug collision by appending numeric suffixes (-2, -3, etc.)
 */

import { injectable, inject } from 'tsyringe';
import type { IFeatureRepository } from '../../../ports/output/repositories/feature-repository.interface.js';
import type { IWorktreeService } from '../../../ports/output/services/worktree-service.interface.js';

/** Maximum number of suffix attempts before giving up */
const MAX_SUFFIX = 10;

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
   * Find a unique slug by checking both the feature DB and git branches.
   * If the original slug conflicts, appends -2, -3, etc. until a free one is found.
   */
  async resolveUniqueSlug(
    originalSlug: string,
    repositoryPath: string
  ): Promise<SlugResolutionResult> {
    for (let suffix = 0; suffix <= MAX_SUFFIX; suffix++) {
      const slug = suffix === 0 ? originalSlug : `${originalSlug}-${suffix + 1}`;
      const branch = `feat/${slug}`;

      // Check if a feature with this slug already exists in the DB
      const existing = await this.featureRepo.findBySlug(slug, repositoryPath);
      if (existing) {
        if (suffix === 0) continue; // try suffixed version
        continue;
      }

      // Check if the git branch already exists (worktree or standalone branch)
      const branchInUse = await this.worktreeService.exists(repositoryPath, branch);
      const branchExists = await this.worktreeService.branchExists(repositoryPath, branch);
      if (branchInUse || branchExists) continue;

      if (suffix > 0) {
        return {
          slug,
          branch,
          warning: `Branch "feat/${originalSlug}" already exists, using "${branch}" instead`,
        };
      }

      return { slug, branch };
    }

    throw new Error(
      `Could not find a unique slug for "${originalSlug}" after ${MAX_SUFFIX} attempts`
    );
  }
}
