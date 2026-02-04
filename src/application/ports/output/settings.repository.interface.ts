/**
 * Settings Repository Interface
 *
 * Output port for Settings persistence operations.
 * Implementations handle database-specific logic (SQLite, etc.).
 *
 * Following Clean Architecture:
 * - Domain and Application layers depend on this interface
 * - Infrastructure layer provides concrete implementations
 */

import type { Settings } from '../../../domain/generated/output.js';

/**
 * Repository interface for Settings entity persistence.
 *
 * Implementations must:
 * - Enforce singleton pattern (only one Settings record allowed)
 * - Handle database connection management
 * - Provide thread-safe operations
 */
export interface ISettingsRepository {
  /**
   * Initialize settings for the first time.
   * Creates a new Settings record in the database.
   *
   * @param settings - The settings to initialize with
   * @throws Error if settings already exist (singleton constraint)
   */
  initialize(settings: Settings): Promise<void>;

  /**
   * Load existing settings from the database.
   *
   * @returns The existing Settings or null if not initialized
   */
  load(): Promise<Settings | null>;

  /**
   * Update existing settings in the database.
   *
   * @param settings - The updated settings to persist
   * @throws Error if settings don't exist (must initialize first)
   */
  update(settings: Settings): Promise<void>;
}
