/**
 * Interactive Session Repository Interface
 *
 * Output port for InteractiveSession persistence operations.
 *
 * Following Clean Architecture:
 * - Domain and Application layers depend on this interface
 * - Infrastructure layer provides the SQLite implementation
 */

import type {
  InteractiveSession,
  InteractiveSessionStatus,
} from '../../../../domain/generated/output.js';

/**
 * Repository interface for InteractiveSession entity persistence.
 */
export interface IInteractiveSessionRepository {
  /**
   * Create a new interactive session record.
   */
  create(session: InteractiveSession): Promise<void>;

  /**
   * Find a session by its unique ID.
   */
  findById(id: string): Promise<InteractiveSession | null>;

  /**
   * Find the most recent session for a given feature.
   */
  findByFeatureId(featureId: string): Promise<InteractiveSession | null>;

  /**
   * Find all sessions with status 'booting' or 'ready'.
   * Used for concurrent session cap enforcement and zombie cleanup.
   */
  findAllActive(): Promise<InteractiveSession[]>;

  /**
   * Update session status and optionally set stoppedAt.
   */
  updateStatus(id: string, status: InteractiveSessionStatus, stoppedAt?: Date): Promise<void>;

  /**
   * Update the lastActivityAt timestamp for a session.
   */
  updateLastActivity(id: string, lastActivityAt: Date): Promise<void>;

  /**
   * Mark all sessions with status 'booting' or 'ready' as 'stopped'.
   * Called on server startup to clean up zombie sessions from prior restart.
   */
  markAllActiveStopped(): Promise<void>;

  /**
   * Count sessions with status 'booting' or 'ready'.
   * Used to enforce the concurrent session cap.
   */
  countActiveSessions(): Promise<number>;
}
