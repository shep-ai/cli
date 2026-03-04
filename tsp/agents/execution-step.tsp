/**
 * @module Shep.Agents.ExecutionStep
 *
 * Hierarchical execution step within an agent run. Replaces the flat
 * PhaseTiming model with a tree structure supporting nested sub-steps,
 * metadata capture, and automatic instrumentation via graph middleware.
 *
 * ## Hierarchy
 *
 * ```
 * AgentRun
 *   +-- ExecutionStep (phase: "analyze")
 *   |     +-- ExecutionStep (subStep: "validate")
 *   |     +-- ExecutionStep (subStep: "repair")
 *   +-- ExecutionStep (phase: "requirements")
 *   |     +-- ExecutionStep (approvalWait)
 *   +-- ExecutionStep (phase: "merge")
 *         +-- ExecutionStep (subStep: "commit")
 *         +-- ExecutionStep (subStep: "push")
 *         +-- ExecutionStep (subStep: "create-pr")
 *         +-- ExecutionStep (subStep: "watch-ci")
 *         +-- ExecutionStep (subStep: "fix-attempt-1")
 * ```
 */
import "../common/base.tsp";
import "./enums/execution-step-type.tsp";
import "./enums/execution-step-status.tsp";

@doc("Hierarchical execution step within an agent run")
model ExecutionStep extends BaseEntity {
  @doc("Agent run this step belongs to")
  agentRunId: string;

  @doc("Parent step ID for hierarchy (null for root/phase-level steps)")
  parentId?: string;

  @doc("Human-readable step name (e.g., 'analyze', 'watch-ci', 'fix-attempt-1')")
  name: string;

  @doc("Step classification determining hierarchy behavior")
  type: ExecutionStepType;

  @doc("Current execution state")
  status: ExecutionStepStatus;

  @doc("When the step started executing")
  startedAt: utcDateTime;

  @doc("When the step finished executing (null if still running)")
  completedAt?: utcDateTime;

  @doc("Duration in milliseconds (computed on completion)")
  durationMs?: int64;

  @doc("Step result summary (e.g., 'success', 'failed: timeout', 'rejected: add more detail')")
  outcome?: string;

  @doc("Arbitrary key-value metadata (JSON). Captures inputs, outputs, error details.")
  metadata?: string;

  @doc("Ordering within siblings under the same parent. Auto-incremented per parent.")
  sequenceNumber: int32;
}
