/**
 * @module Shep.Agents.AgentRunEvent
 *
 * Streaming event emitted during agent execution.
 * Used for progress tracking and real-time output.
 * This is a value object — not persisted as its own entity.
 */
@doc("Streaming event emitted during agent execution")
model AgentRunEvent {
  @doc("Event type: progress, result, or error")
  type: "progress" | "result" | "error";

  @doc("Event content")
  content: string;

  @doc("Event timestamp")
  timestamp: utcDateTime;
}
