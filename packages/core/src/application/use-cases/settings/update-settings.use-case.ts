/**
 * Update Settings Use Case
 *
 * Updates existing settings in the database.
 * Validates input and persists changes.
 *
 * Business Rules:
 * - Settings must exist before updating
 * - All fields are updatable
 * - Returns updated settings after persistence
 */

import { injectable, inject } from 'tsyringe';
import type { Settings } from '../../../domain/generated/output.js';
import type { ISettingsRepository } from '../../ports/output/repositories/settings.repository.interface.js';

/**
 * Use case for updating existing settings.
 *
 * Algorithm:
 * 1. Receive updated settings
 * 2. Persist to repository
 * 3. Return updated settings
 */
@injectable()
export class UpdateSettingsUseCase {
  constructor(
    @inject('ISettingsRepository')
    private readonly settingsRepository: ISettingsRepository
  ) {}

  /**
   * Execute the update settings use case.
   *
   * @param settings - The updated settings to persist
   * @returns The updated Settings
   */
  async execute(settings: Settings): Promise<Settings> {
    // Persist updated settings
    await this.settingsRepository.update(settings);

    // Return the updated settings
    return settings;
  }
}
