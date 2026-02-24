/**
 * @module Shep.Agents.AgentSessionMessage
 *
 * A single message within an agent provider CLI session.
 * Content is normalized to a plain string in the infrastructure layer
 * (text blocks extracted, tool calls and thinking blocks excluded).
 */
@doc("A single message within an agent provider CLI session")
model AgentSessionMessage {
  @doc("Provider-native message UUID")
  uuid: string;

  @doc("Message role — user turn or assistant turn")
  role: "user" | "assistant";

  @doc("Normalized message content as plain text (tool calls and thinking blocks excluded)")
  content: string;

  @doc("Timestamp when the message was recorded")
  timestamp: utcDateTime;
}
