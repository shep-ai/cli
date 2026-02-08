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
import type { ISettingsRepository } from '../../ports/output/settings.repository.interface.js';
import type { ILogger } from '../../ports/output/logger.interface.js';
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
    private readonly settingsRepository: ISettingsRepository,
    @inject('ILogger')
    private readonly logger: ILogger
  ) {}

  /**
   * Execute the initialize settings use case.
   *
   * @returns Existing or newly created Settings
   */
  async execute(): Promise<Settings> {
    this.logger.debug('Executing initialize settings use case', { source: 'use-case:settings' });

    // Check if settings already exist
    const existingSettings = await this.settingsRepository.load();

    if (existingSettings) {
      this.logger.debug('Settings already exist, returning existing', {
        source: 'use-case:settings',
        settingsId: existingSettings.id,
      });
      return existingSettings;
    }

    // Create new settings with defaults
    const newSettings = createDefaultSettings();

    // Persist to database
    await this.settingsRepository.initialize(newSettings);

    this.logger.info('Settings initialized successfully', {
      source: 'use-case:settings',
      settingsId: newSettings.id,
    });

    return newSettings;
  }
}
