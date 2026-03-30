/**
 * Auto-Archive Completed Use Case
 *
 * Scans for features in the Maintain (completed) lifecycle whose updatedAt
 * timestamp is older than the configured delay, and archives them automatically.
 *
 * Business Rules:
 * - Only features in Maintain lifecycle are candidates
 * - The delay is read from settings (workflow.autoArchiveDelayMinutes)
 * - A delay of 0 disables auto-archiving
 * - Uses the existing ArchiveFeatureUseCase for each archival to maintain
 *   consistent lifecycle transitions (previousLifecycle preservation, etc.)
 */

import { injectable, inject } from 'tsyringe';
import type { Feature } from '../../../domain/generated/output.js';
import { SdlcLifecycle } from '../../../domain/generated/output.js';
import type { IFeatureRepository } from '../../ports/output/repositories/feature-repository.interface.js';
import { ArchiveFeatureUseCase } from './archive-feature.use-case.js';

const MS_PER_MINUTE = 60_000;

@injectable()
export class AutoArchiveCompletedUseCase {
  constructor(
    @inject('IFeatureRepository') private readonly featureRepo: IFeatureRepository,
    private readonly archiveFeature: ArchiveFeatureUseCase
  ) {}

  /**
   * Archive all features in Maintain state that have been completed longer
   * than the given delay.
   *
   * @param delayMinutes - Minutes after completion before archiving. 0 = disabled.
   * @returns Array of features that were archived.
   */
  async execute(delayMinutes: number): Promise<Feature[]> {
    if (delayMinutes <= 0) return [];

    const features = await this.featureRepo.list({
      lifecycle: SdlcLifecycle.Maintain,
    });

    const now = Date.now();
    const thresholdMs = delayMinutes * MS_PER_MINUTE;
    const archived: Feature[] = [];

    for (const feature of features) {
      const updatedMs =
        feature.updatedAt instanceof Date
          ? feature.updatedAt.getTime()
          : new Date(feature.updatedAt).getTime();

      if (now - updatedMs >= thresholdMs) {
        try {
          const result = await this.archiveFeature.execute(feature.id);
          archived.push(result);
        } catch {
          // Feature may have been archived/deleted by another process — skip
        }
      }
    }

    return archived;
  }
}
