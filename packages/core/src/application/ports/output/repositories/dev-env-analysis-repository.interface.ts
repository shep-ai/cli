/**
 * Dev Environment Analysis Repository Interface
 *
 * Output port for DevEnvironmentAnalysis persistence operations.
 * Stores cached analysis results keyed by repository cache key
 * (git remote URL or root repo absolute path).
 *
 * Following Clean Architecture:
 * - Domain and Application layers depend on this interface
 * - Infrastructure layer provides concrete implementations
 */

import type { DevEnvironmentAnalysis } from '../../../../domain/generated/output.js';

/**
 * Repository interface for DevEnvironmentAnalysis entity persistence.
 *
 * Implementations must:
 * - Handle database connection management
 * - Enforce UNIQUE constraint on cache_key
 * - Support lookup by cache key for cache hit/miss detection
 */
export interface IDevEnvAnalysisRepository {
  /**
   * Find a cached analysis by its cache key.
   *
   * @param cacheKey - The resolved cache key (git remote URL or root repo path)
   * @returns The cached analysis or null if not found
   */
  findByCacheKey(cacheKey: string): Promise<DevEnvironmentAnalysis | null>;

  /**
   * Save a new analysis record.
   *
   * @param analysis - The analysis to persist
   * @throws If a record with the same cache_key already exists
   */
  save(analysis: DevEnvironmentAnalysis): Promise<void>;

  /**
   * Update an existing analysis record by cache key.
   *
   * @param analysis - The analysis with updated fields
   */
  update(analysis: DevEnvironmentAnalysis): Promise<void>;

  /**
   * Delete a cached analysis by its cache key.
   * Used for manual cache invalidation (re-analyze).
   *
   * @param cacheKey - The resolved cache key to delete
   */
  deleteByCacheKey(cacheKey: string): Promise<void>;
}
