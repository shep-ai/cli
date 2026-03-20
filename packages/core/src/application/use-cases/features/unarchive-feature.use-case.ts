/**
 * Unarchive Feature Use Case
 *
 * Restores a feature from Archived to its previousLifecycle value,
 * then clears previousLifecycle.
 *
 * Business Rules:
 * - Only features in the Archived state can be unarchived
 * - previousLifecycle must be non-null for restoration
 * - The lifecycle is restored to the pre-archive state
 * - previousLifecycle is cleared after restoration
 */

import { injectable, inject } from 'tsyringe';
import type { Feature } from '../../../domain/generated/output.js';
import { SdlcLifecycle } from '../../../domain/generated/output.js';
import type { IFeatureRepository } from '../../ports/output/repositories/feature-repository.interface.js';

@injectable()
export class UnarchiveFeatureUseCase {
  constructor(@inject('IFeatureRepository') private readonly featureRepo: IFeatureRepository) {}

  async execute(featureId: string): Promise<Feature> {
    // 1. Find feature (exact or prefix match)
    const feature =
      (await this.featureRepo.findById(featureId)) ??
      (await this.featureRepo.findByIdPrefix(featureId));
    if (!feature) {
      throw new Error(`Feature not found: "${featureId}"`);
    }

    // 2. Validate lifecycle is Archived
    if (feature.lifecycle !== SdlcLifecycle.Archived) {
      throw new Error(
        `Cannot unarchive feature "${feature.name}": lifecycle is ${feature.lifecycle}. ` +
          `Only archived features can be unarchived.`
      );
    }

    // 3. Validate previousLifecycle exists
    if (!feature.previousLifecycle) {
      throw new Error(
        `Cannot unarchive feature "${feature.name}": no previous lifecycle state recorded. ` +
          `The feature may have been archived before this field was introduced.`
      );
    }

    // 4. Restore lifecycle and clear previousLifecycle
    const updatedFeature: Feature = {
      ...feature,
      lifecycle: feature.previousLifecycle,
      previousLifecycle: undefined,
      updatedAt: new Date(),
    };

    await this.featureRepo.update(updatedFeature);

    return updatedFeature;
  }
}
