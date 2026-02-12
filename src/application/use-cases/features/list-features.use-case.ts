/**
 * List Features Use Case
 *
 * Retrieves features with optional filtering by repository path or lifecycle.
 *
 * Business Rules:
 * - Returns all features when no filters are provided
 * - Filters are passed through to the repository
 */

import { injectable, inject } from 'tsyringe';
import type { Feature } from '../../../domain/generated/output.js';
import type {
  IFeatureRepository,
  FeatureListFilters,
} from '../../ports/output/repositories/feature-repository.interface.js';

@injectable()
export class ListFeaturesUseCase {
  constructor(
    @inject('IFeatureRepository')
    private readonly featureRepo: IFeatureRepository
  ) {}

  async execute(filters?: FeatureListFilters): Promise<Feature[]> {
    return this.featureRepo.list(filters);
  }
}
