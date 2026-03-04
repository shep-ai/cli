/**
 * Execution History DTOs
 *
 * Pure interfaces representing hierarchical execution history
 * for both CLI and web UI consumption. No runtime dependencies.
 */

import type { ExecutionStepStatus, ExecutionStepType } from '../../domain/generated/output.js';

/**
 * A single execution step in the tree, with nested children.
 */
export interface ExecutionStepDTO {
  id: string;
  name: string;
  type: ExecutionStepType;
  status: ExecutionStepStatus;
  startedAt: Date;
  completedAt?: Date;
  durationMs?: number;
  outcome?: string;
  metadata?: Record<string, unknown>;
  children: ExecutionStepDTO[];
}

/**
 * Complete execution history for an agent run, including
 * the tree of steps and computed totals.
 */
export interface ExecutionHistoryDTO {
  agentRunId: string;
  agentRunStatus?: string;
  featureId?: string;
  steps: ExecutionStepDTO[];
  totalDurationMs: number;
  totalWaitMs: number;
}
