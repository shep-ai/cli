/**
 * Phase Timing Repository Interface
 *
 * Output port for PhaseTiming persistence operations.
 * Records timing data for each agent graph node execution.
 *
 * Following Clean Architecture:
 * - Domain and Application layers depend on this interface
 * - Infrastructure layer provides concrete implementations
 */

import type { PhaseTiming } from '../../../../domain/generated/output.js';

/**
 * Repository interface for PhaseTiming entity persistence.
 */
export interface IPhaseTimingRepository {
  /**
   * Save a new phase timing record.
   *
   * @param phaseTiming - The phase timing to persist
   */
  save(phaseTiming: PhaseTiming): Promise<void>;

  /**
   * Update a phase timing record (typically to set completedAt and durationMs).
   *
   * @param id - The phase timing ID
   * @param updates - Fields to update
   */
  update(
    id: string,
    updates: Partial<Pick<PhaseTiming, 'completedAt' | 'durationMs'>>
  ): Promise<void>;

  /**
   * Find all phase timings for an agent run.
   *
   * @param agentRunId - The agent run ID
   * @returns Array of phase timings ordered by creation
   */
  findByRunId(agentRunId: string): Promise<PhaseTiming[]>;

  /**
   * Find all phase timings for a feature (via agent_runs join).
   *
   * @param featureId - The feature ID
   * @returns Array of phase timings ordered by creation
   */
  findByFeatureId(featureId: string): Promise<PhaseTiming[]>;
}
