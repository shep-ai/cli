/**
 * Archive Feature Use Case
 *
 * Transitions a feature's lifecycle to Archived, storing the current lifecycle
 * in previousLifecycle for restoration on unarchive.
 *
 * Business Rules:
 * - Any feature can be archived except those already Archived or Deleting
 * - Features with active (non-archived, non-deleted) children cannot be archived
 * - The current lifecycle is preserved in previousLifecycle for unarchive restoration
 * - No git operations or agent cancellations are triggered (archive is non-destructive)
 */

import { injectable, inject } from 'tsyringe';
import type { Feature } from '../../../domain/generated/output.js';
import { SdlcLifecycle } from '../../../domain/generated/output.js';
import type { IFeatureRepository } from '../../ports/output/repositories/feature-repository.interface.js';

/** Lifecycle states that cannot be archived. */
const NON_ARCHIVABLE_STATES = new Set<SdlcLifecycle>([
  SdlcLifecycle.Archived,
  SdlcLifecycle.Deleting,
]);

@injectable()
export class ArchiveFeatureUseCase {
  constructor(@inject('IFeatureRepository') private readonly featureRepo: IFeatureRepository) {}

  async execute(featureId: string): Promise<Feature> {
    // 1. Find feature (exact or prefix match)
    const feature =
      (await this.featureRepo.findById(featureId)) ??
      (await this.featureRepo.findByIdPrefix(featureId));
    if (!feature) {
      throw new Error(`Feature not found: "${featureId}"`);
    }

    // 2. Validate lifecycle is archivable
    if (NON_ARCHIVABLE_STATES.has(feature.lifecycle)) {
      throw new Error(
        `Cannot archive feature "${feature.name}": lifecycle is ${feature.lifecycle}. ` +
          `Features that are already archived or being deleted cannot be archived.`
      );
    }

    // 3. Check for active (non-archived, non-deleted) children
    const children = await this.featureRepo.findByParentId(feature.id);
    const activeChildren = children.filter(
      (c) => c.lifecycle !== SdlcLifecycle.Archived && !c.deletedAt
    );
    if (activeChildren.length > 0) {
      const names = activeChildren.map((c) => c.name).join(', ');
      throw new Error(
        `Cannot archive feature "${feature.name}": it has active child features (${names}). ` +
          `Archive or delete child features first.`
      );
    }

    // 4. Store current lifecycle and transition to Archived
    const updatedFeature: Feature = {
      ...feature,
      previousLifecycle: feature.lifecycle,
      lifecycle: SdlcLifecycle.Archived,
      updatedAt: new Date(),
    };

    await this.featureRepo.update(updatedFeature);

    return updatedFeature;
  }
}
