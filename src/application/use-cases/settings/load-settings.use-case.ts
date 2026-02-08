/**
 * Load Settings Use Case
 *
 * Retrieves existing settings from the database.
 * Throws error if settings don't exist (must initialize first).
 *
 * Business Rules:
 * - Settings must be initialized before loading
 * - Returns complete Settings object
 * - Read-only operation (no mutations)
 */

import { injectable, inject } from 'tsyringe';
import type { Settings } from '../../../domain/generated/output.js';
import type { ISettingsRepository } from '../../ports/output/settings.repository.interface.js';
import type { ILogger } from '../../ports/output/logger.interface.js';

/**
 * Use case for loading existing settings.
 *
 * Algorithm:
 * 1. Load settings from repository
 * 2. If not found, throw error with helpful message
 * 3. Return settings
 */
@injectable()
export class LoadSettingsUseCase {
  constructor(
    @inject('ISettingsRepository')
    private readonly settingsRepository: ISettingsRepository,
    @inject('ILogger')
    private readonly logger: ILogger
  ) {}

  /**
   * Execute the load settings use case.
   *
   * @returns Existing Settings
   * @throws Error if settings don't exist
   */
  async execute(): Promise<Settings> {
    this.logger.debug('Loading settings', { source: 'use-case:settings' });

    const settings = await this.settingsRepository.load();

    if (!settings) {
      this.logger.error('Settings not found', { source: 'use-case:settings' });
      throw new Error('Settings not found. Please run initialization first.');
    }

    this.logger.debug('Settings loaded successfully', {
      source: 'use-case:settings',
      settingsId: settings.id,
    });

    return settings;
  }
}
