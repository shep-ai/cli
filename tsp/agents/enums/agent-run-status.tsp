/**
 * @module Shep.Agents.Enums.AgentRunStatus
 *
 * Execution state of an agent run. Tracks the lifecycle from
 * creation through completion, failure, or interruption.
 *
 * ## State Transitions
 *
 * ```
 * pending --> running --> completed
 *               |
 *               +--> failed
 *               +--> interrupted (crash detected)
 *               +--> cancelled (user-initiated)
 * ```
 */
@doc("Agent run execution status")
enum AgentRunStatus {
  @doc("Created but not yet started")
  pending: "pending",

  @doc("Currently executing")
  running: "running",

  @doc("Successfully completed")
  completed: "completed",

  @doc("Failed with error")
  failed: "failed",

  @doc("Crashed/orphaned, recoverable via checkpoint resume")
  interrupted: "interrupted",

  @doc("Manually cancelled by user")
  cancelled: "cancelled",
}
