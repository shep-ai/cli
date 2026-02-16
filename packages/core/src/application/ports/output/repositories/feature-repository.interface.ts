/**
 * Feature Repository Interface
 *
 * Output port for Feature persistence operations.
 * Implementations handle database-specific logic (SQLite, etc.).
 *
 * Following Clean Architecture:
 * - Domain and Application layers depend on this interface
 * - Infrastructure layer provides concrete implementations
 */

import type { Feature, SdlcLifecycle } from '../../../../domain/generated/output.js';

/**
 * Filters for listing features.
 */
export interface FeatureListFilters {
  repositoryPath?: string;
  lifecycle?: SdlcLifecycle;
}

/**
 * Repository interface for Feature entity persistence.
 *
 * Implementations must:
 * - Handle database connection management
 * - Provide thread-safe operations
 * - Support query by slug + repositoryPath for uniqueness
 */
export interface IFeatureRepository {
  /**
   * Create a new feature record.
   *
   * @param feature - The feature to persist
   */
  create(feature: Feature): Promise<void>;

  /**
   * Find a feature by its unique ID.
   *
   * @param id - The feature ID
   * @returns The feature or null if not found
   */
  findById(id: string): Promise<Feature | null>;

  /**
   * Find a feature by an ID prefix (e.g. first 8 chars from `feat ls`).
   *
   * @param prefix - A prefix of the feature UUID
   * @returns The feature if exactly one match, null if none, throws if ambiguous
   */
  findByIdPrefix(prefix: string): Promise<Feature | null>;

  /**
   * Find a feature by its slug within a repository.
   *
   * @param slug - The URL-friendly feature identifier
   * @param repositoryPath - The repository path to scope the search
   * @returns The feature or null if not found
   */
  findBySlug(slug: string, repositoryPath: string): Promise<Feature | null>;

  /**
   * List features with optional filters.
   *
   * @param filters - Optional filters for repositoryPath and lifecycle
   * @returns Array of matching features
   */
  list(filters?: FeatureListFilters): Promise<Feature[]>;

  /**
   * Update an existing feature.
   *
   * @param feature - The feature with updated fields
   */
  update(feature: Feature): Promise<void>;

  /**
   * Delete a feature by ID.
   *
   * @param id - The feature ID to delete
   */
  delete(id: string): Promise<void>;
}
