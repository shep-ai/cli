/**
 * Show Feature Use Case
 *
 * Retrieves a single feature by its ID.
 *
 * Business Rules:
 * - Throws if the feature does not exist
 * - Error message includes the requested ID for debugging
 */

import { injectable, inject } from 'tsyringe';
import type { Feature } from '../../../domain/generated/output.js';
import type { IFeatureRepository } from '../../ports/output/repositories/feature-repository.interface.js';

@injectable()
export class ShowFeatureUseCase {
  constructor(
    @inject('IFeatureRepository')
    private readonly featureRepo: IFeatureRepository
  ) {}

  async execute(featureId: string): Promise<Feature> {
    // Try exact match first, then prefix match for short IDs (e.g. from `feat ls`)
    const feature =
      (await this.featureRepo.findById(featureId)) ??
      (await this.featureRepo.findByIdPrefix(featureId));
    if (!feature) {
      throw new Error(`Feature not found: "${featureId}"`);
    }
    return feature;
  }
}
