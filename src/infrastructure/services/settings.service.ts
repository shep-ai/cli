/**
 * Settings Service
 *
 * Provides global access to application settings within the CLI.
 * Implements singleton pattern for consistent settings access.
 *
 * Usage:
 * ```typescript
 * import { getSettings } from './infrastructure/services/settings.service.js';
 *
 * const settings = getSettings();
 * console.log(settings.models.analyze); // 'claude-opus-4'
 * ```
 */

import type { Settings } from '../../domain/generated/output.js';

/**
 * Singleton settings instance.
 * Set during CLI initialization, accessed throughout application lifecycle.
 */
let settingsInstance: Settings | null = null;

/**
 * Initialize the settings service with loaded settings.
 * Must be called once during CLI bootstrap.
 *
 * @param settings - The initialized settings
 * @throws Error if settings are already initialized
 */
export function initializeSettings(settings: Settings): void {
  if (settingsInstance !== null) {
    throw new Error('Settings already initialized. Cannot re-initialize.');
  }

  settingsInstance = settings;
}

/**
 * Get the current application settings.
 *
 * @returns Current settings instance
 * @throws Error if settings haven't been initialized yet
 *
 * @example
 * ```typescript
 * const settings = getSettings();
 * console.log(settings.system.logLevel); // 'info'
 * ```
 */
export function getSettings(): Settings {
  if (settingsInstance === null) {
    throw new Error('Settings not initialized. Call initializeSettings() during CLI bootstrap.');
  }

  return settingsInstance;
}

/**
 * Check if settings have been initialized.
 *
 * @returns True if settings are initialized, false otherwise
 */
export function hasSettings(): boolean {
  return settingsInstance !== null;
}

/**
 * Reset settings instance (for testing purposes only).
 * DO NOT use in production code.
 *
 * @internal
 */
export function resetSettings(): void {
  settingsInstance = null;
}
