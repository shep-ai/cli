/**
 * Create Feature Use Case
 *
 * Creates a new feature entity with a git worktree for isolated development.
 *
 * Business Rules:
 * - Slug is generated from the description (lowercase, hyphenated)
 * - Slug must be unique within the repository
 * - A git worktree is created for the feature branch
 * - Initial lifecycle is Requirements
 */

import { injectable, inject } from 'tsyringe';
import { randomUUID } from 'node:crypto';
import type { Feature } from '../../../domain/generated/output.js';
import { SdlcLifecycle } from '../../../domain/generated/output.js';
import type { IFeatureRepository } from '../../ports/output/feature-repository.interface.js';
import type { IWorktreeService } from '../../ports/output/worktree-service.interface.js';

export interface CreateFeatureInput {
  description: string;
  repositoryPath: string;
}

@injectable()
export class CreateFeatureUseCase {
  constructor(
    @inject('IFeatureRepository')
    private readonly featureRepo: IFeatureRepository,
    @inject('IWorktreeService')
    private readonly worktreeService: IWorktreeService
  ) {}

  async execute(input: CreateFeatureInput): Promise<Feature> {
    const slug = this.generateSlug(input.description);
    const branch = `feat/${slug}`;

    const existing = await this.featureRepo.findBySlug(slug, input.repositoryPath);
    if (existing) {
      throw new Error(`Feature with slug "${slug}" already exists in this repository`);
    }

    const now = new Date();
    const feature: Feature = {
      id: randomUUID(),
      name: input.description,
      slug,
      description: input.description,
      repositoryPath: input.repositoryPath,
      branch,
      lifecycle: SdlcLifecycle.Requirements,
      messages: [],
      relatedArtifacts: [],
      createdAt: now,
      updatedAt: now,
    };

    await this.featureRepo.create(feature);

    const worktreePath = this.worktreeService.getWorktreePath(input.repositoryPath, branch);
    await this.worktreeService.create(input.repositoryPath, branch, worktreePath);

    return feature;
  }

  private generateSlug(description: string): string {
    return description
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }
}
