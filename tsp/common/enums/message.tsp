/**
 * @module Shep.Common.Enums.Message
 *
 * Defines enums for message-related entities in the Shep AI platform,
 * particularly for conversational interactions between the user and AI.
 */
/**
 * Identifies the role of a participant in a conversation.
 * Used to distinguish between user input and AI responses.
 */
@doc("Roles for participants in conversational interactions")
enum MessageRole {
  /**
   * Message from the AI assistant - responses, suggestions,
   * questions, and guidance provided by the system.
   */
  @doc("Message from the AI assistant")
  Assistant: "assistant",

  /**
   * Message from the human user - requirements, clarifications,
   * approvals, and other user input.
   */
  @doc("Message from the human user")
  User: "user",
}
