/**
 * @module Shep.Agents.Enums.ExecutionStepStatus
 *
 * Current execution state of a step within an agent run.
 */
@doc("Current execution state of a step")
enum ExecutionStepStatus {
  @doc("Step created but not yet started")
  pending: "pending",

  @doc("Step is currently executing")
  running: "running",

  @doc("Step completed successfully")
  completed: "completed",

  @doc("Step failed with an error")
  failed: "failed",

  @doc("Step was skipped")
  skipped: "skipped",
}
