/**
 * Delete Repository Use Case
 *
 * Deletes a Repository and all its child features.
 * Each feature is properly cleaned up (agent runs cancelled, worktrees removed)
 * via DeleteFeatureUseCase before the repository is soft-deleted.
 */

import { injectable, inject } from 'tsyringe';
import type { IRepositoryRepository } from '../../ports/output/repositories/repository-repository.interface.js';
import type { IFeatureRepository } from '../../ports/output/repositories/feature-repository.interface.js';
import { DeleteFeatureUseCase } from '../features/delete-feature.use-case.js';

@injectable()
export class DeleteRepositoryUseCase {
  constructor(
    @inject('IRepositoryRepository')
    private readonly repositoryRepo: IRepositoryRepository,
    @inject('IFeatureRepository')
    private readonly featureRepo: IFeatureRepository,
    @inject(DeleteFeatureUseCase)
    private readonly deleteFeature: DeleteFeatureUseCase
  ) {}

  async execute(id: string): Promise<void> {
    const repository = await this.repositoryRepo.findById(id);
    if (!repository) {
      throw new Error(`Repository not found: "${id}"`);
    }

    // Delete all child features (cancels agent runs, removes worktrees).
    // Include archived features so they don't survive as orphans.
    const features = await this.featureRepo.list({
      repositoryPath: repository.path,
      includeArchived: true,
    });
    for (const feature of features) {
      await this.deleteFeature.execute(feature.id);
    }

    await this.repositoryRepo.softDelete(id);
  }
}
