/**
 * @module Shep.Common.Enums.Agent
 *
 * Defines enums for agent status tracking in the Shep AI platform.
 * Agents are AI-powered components that perform autonomous tasks.
 */
/**
 * Agent Status Transition Flow:
 * ```
 * Idle --> Running --> Paused --> Running
 *   ^         |           |          |
 *   |         v           v          v
 *   +------Stopped<-------+----------+
 * ```
 */
@doc("Operational states for AI agents")
enum AgentStatus {
  /**
   * Agent is initialized but not currently executing any tasks.
   * Ready to accept new work when assigned.
   */
  @doc("Agent is ready but not currently executing tasks")
  Idle,

  /**
   * Agent is actively executing assigned tasks.
   * Processing, analyzing, or generating output.
   */
  @doc("Agent is actively executing tasks")
  Running,

  /**
   * Agent execution has been temporarily suspended.
   * Can be resumed to continue from the pause point.
   */
  @doc("Agent execution temporarily suspended")
  Paused,

  /**
   * Agent has been fully stopped and requires restart
   * to begin processing again. May have completed work
   * or been terminated.
   */
  @doc("Agent has been stopped and requires restart")
  Stopped,
}
