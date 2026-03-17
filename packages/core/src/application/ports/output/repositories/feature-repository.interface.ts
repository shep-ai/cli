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
  /** When true, include soft-deleted features in results. Default: false. */
  includeDeleted?: boolean;
}

/**
 * Repository interface for Feature entity persistence.
 *
 * Implementations must:
 * - Handle database connection management
 * - Provide thread-safe operations
 * - Support query by slug + repositoryPath for uniqueness
 * - Exclude soft-deleted features from queries by default
 */
export interface IFeatureRepository {
  /**
   * Create a new feature record.
   *
   * @param feature - The feature to persist
   */
  create(feature: Feature): Promise<void>;

  /**
   * Find a feature by its unique ID (excludes soft-deleted).
   *
   * @param id - The feature ID
   * @returns The feature or null if not found
   */
  findById(id: string): Promise<Feature | null>;

  /**
   * Find a feature by an ID prefix (e.g. first 8 chars from `feat ls`).
   * Excludes soft-deleted features.
   *
   * @param prefix - A prefix of the feature UUID
   * @returns The feature if exactly one match, null if none, throws if ambiguous
   */
  findByIdPrefix(prefix: string): Promise<Feature | null>;

  /**
   * Find a feature by its slug within a repository (excludes soft-deleted).
   *
   * @param slug - The URL-friendly feature identifier
   * @param repositoryPath - The repository path to scope the search
   * @returns The feature or null if not found
   */
  findBySlug(slug: string, repositoryPath: string): Promise<Feature | null>;

  /**
   * Find a feature by its branch name within a repository (excludes soft-deleted).
   *
   * Used for duplicate adoption detection — ensures a branch is not already
   * tracked as a feature before adopting it.
   *
   * @param branch - The exact git branch name
   * @param repositoryPath - The repository path to scope the search
   * @returns The feature or null if not found
   */
  findByBranch(branch: string, repositoryPath: string): Promise<Feature | null>;

  /**
   * List features with optional filters.
   * Excludes soft-deleted features unless includeDeleted is true.
   *
   * @param filters - Optional filters for repositoryPath, lifecycle, and includeDeleted
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
   * Returns all direct (non-recursive) children of the given parent feature ID.
   * Children are ordered by creation time ascending.
   * Includes children regardless of soft-delete status (for cascade operations).
   *
   * @param parentId - The parent feature ID
   * @returns Array of direct child features
   */
  findByParentId(parentId: string): Promise<Feature[]>;

  /**
   * Delete a feature by ID (hard delete).
   *
   * @param id - The feature ID to delete
   */
  delete(id: string): Promise<void>;

  /**
   * Soft-delete a feature by setting deletedAt timestamp.
   *
   * @param id - The feature ID to soft-delete
   */
  softDelete(id: string): Promise<void>;
}
