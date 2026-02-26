/**
 * @module Shep.Agents.Enums.ExecutionStepType
 *
 * Classification of execution steps within an agent run.
 * Determines the visual hierarchy and aggregation behavior.
 */
@doc("Type classification for an execution step")
enum ExecutionStepType {
  @doc("Top-level graph node execution (analyze, requirements, etc.)")
  phase: "phase",

  @doc("Nested operation within a phase (validation, repair, CI watch, fix attempt)")
  subStep: "sub_step",

  @doc("Agent run lifecycle event (started, resumed, completed, failed)")
  lifecycleEvent: "lifecycle_event",

  @doc("Period spent waiting for human approval")
  approvalWait: "approval_wait",
}
