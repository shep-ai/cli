/**
 * Execution Step Repository Interface
 *
 * Output port for ExecutionStep persistence operations.
 * Records hierarchical step data for agent run execution monitoring.
 *
 * Following Clean Architecture:
 * - Domain and Application layers depend on this interface
 * - Infrastructure layer provides concrete implementations
 */

import type { ExecutionStep, ExecutionStepStatus } from '../../../../domain/generated/output.js';

/**
 * Repository interface for ExecutionStep entity persistence.
 */
export interface IExecutionStepRepository {
  /**
   * Save a new execution step record.
   */
  save(step: ExecutionStep): Promise<void>;

  /**
   * Update an execution step with partial fields.
   * Supports updating status, completedAt, durationMs, outcome, and metadata.
   * Metadata updates are merged with existing metadata (not replaced).
   */
  update(
    id: string,
    updates: Partial<
      Pick<ExecutionStep, 'status' | 'completedAt' | 'durationMs' | 'outcome' | 'metadata'>
    > & { status?: ExecutionStepStatus }
  ): Promise<void>;

  /**
   * Find all execution steps for an agent run, ordered by sequenceNumber.
   */
  findByRunId(agentRunId: string): Promise<ExecutionStep[]>;

  /**
   * Find all execution steps for a feature (via agent_runs join),
   * ordered by agent run creation then sequenceNumber.
   */
  findByFeatureId(featureId: string): Promise<ExecutionStep[]>;

  /**
   * Get the next sequence number for steps under a given parent
   * (or root-level steps for a given run when parentId is null).
   */
  getNextSequenceNumber(agentRunId: string, parentId: string | null): Promise<number>;
}
