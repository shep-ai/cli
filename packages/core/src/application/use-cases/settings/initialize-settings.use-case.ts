/**
 * Initialize Settings Use Case
 *
 * Handles first-time settings initialization.
 * Creates default settings if none exist, or returns existing settings.
 *
 * Business Rules:
 * - Only one Settings record allowed (singleton pattern)
 * - Uses factory defaults for initial values
 * - Idempotent: safe to call multiple times
 */

import { injectable, inject } from 'tsyringe';
import type { Settings } from '../../../domain/generated/output.js';
import type { ISettingsRepository } from '../../ports/output/repositories/settings.repository.interface.js';
import { createDefaultSettings } from '../../../domain/factories/settings-defaults.factory.js';

/**
 * Use case for initializing global settings.
 *
 * Algorithm:
 * 1. Check if settings already exist (load from repository)
 * 2. If exists, return existing settings
 * 3. If not exists, create defaults and initialize in repository
 * 4. Return newly created settings
 */
@injectable()
export class InitializeSettingsUseCase {
  constructor(
    @inject('ISettingsRepository')
    private readonly settingsRepository: ISettingsRepository
  ) {}

  /**
   * Execute the initialize settings use case.
   *
   * @returns Existing or newly created Settings
   */
  async execute(): Promise<Settings> {
    // Check if settings already exist
    const existingSettings = await this.settingsRepository.load();

    if (existingSettings) {
      return existingSettings;
    }

    // Create new settings with defaults
    const newSettings = createDefaultSettings();

    // Persist to database
    await this.settingsRepository.initialize(newSettings);

    return newSettings;
  }
}
