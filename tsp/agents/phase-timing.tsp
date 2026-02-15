/**
 * @module Shep.Agents.PhaseTiming
 *
 * Timing record for a single agent graph node execution.
 * Tracks start, completion, and duration for each phase
 * of the agent lifecycle. Stored in the phase_timings table.
 */
import "../common/base.tsp";

@doc("Timing record for a single agent graph node execution")
model PhaseTiming extends BaseEntity {
  @doc("Agent run this timing belongs to")
  agentRunId: string;

  @doc("Graph node name: analyze, requirements, research, plan, implement")
  phase: string;

  @doc("When the phase started executing")
  startedAt: utcDateTime;

  @doc("When the phase finished executing (null if still running)")
  completedAt?: utcDateTime;

  @doc("Duration in milliseconds (computed on completion)")
  durationMs?: int64;
}
