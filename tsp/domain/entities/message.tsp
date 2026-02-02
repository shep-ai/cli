/**
 * @module Shep.Domain.Entities.Message
 *
 * Defines the Message entity for conversational interactions in the Shep AI platform.
 * Messages track the dialogue between users and the AI assistant, including
 * question-answer flows, option selections, and clarification requests.
 *
 * ## Message Flow
 *
 * ```
 * User Query --> Assistant Response --> User Answer/Selection
 *      |               |                        |
 *      v               v                        v
 *  (content)     (content +            (answer or
 *                 options)              selectedOption)
 * ```
 *
 * ## Usage Patterns
 *
 * Messages support several interaction patterns:
 * - **Simple Q&A**: User asks, assistant responds
 * - **Multiple Choice**: Assistant presents options, user selects
 * - **Open-ended**: Assistant asks, user provides freeform answer
 * - **Hybrid**: Options presented with ability to provide custom answer
 */
import "../../common/base.tsp";
import "../../common/enums/message.tsp";

/**
 * Message Entity
 *
 * Represents a single message in a conversation thread between the user
 * and the AI assistant. Messages can contain plain text content, or may
 * include options for the user to select from.
 *
 * ## Properties
 *
 * | Property       | Type         | Required | Description                              |
 * |----------------|--------------|----------|------------------------------------------|
 * | id             | UUID         | Yes      | Unique identifier (from BaseEntity)      |
 * | role           | MessageRole  | Yes      | Who sent the message (User/Assistant)    |
 * | content        | string       | Yes      | The text content of the message          |
 * | options        | string[]     | No       | Choices presented to the user            |
 * | answer         | string       | No       | User's freeform text answer              |
 * | selectedOption | int32        | No       | Index of the option user selected        |
 * | createdAt      | utcDateTime  | Yes      | When created (from BaseEntity)           |
 * | updatedAt      | utcDateTime  | Yes      | When last updated (from BaseEntity)      |
 *
 * ## Example Scenarios
 *
 * ```json
 * // Simple user message
 * {
 *   "id": "msg-001",
 *   "role": "user",
 *   "content": "I want to add authentication to my app"
 * }
 *
 * // Assistant response with options
 * {
 *   "id": "msg-002",
 *   "role": "assistant",
 *   "content": "What authentication method would you prefer?",
 *   "options": ["OAuth 2.0", "JWT tokens", "Session-based", "Other"]
 * }
 *
 * // User selection
 * {
 *   "id": "msg-003",
 *   "role": "user",
 *   "content": "OAuth 2.0",
 *   "selectedOption": 0
 * }
 * ```
 */
@doc("A message in a conversation thread between user and AI assistant")
model Message extends BaseEntity {
  /**
   * Identifies who sent this message in the conversation.
   * Either the human user or the AI assistant.
   */
  @doc("Role of the message sender (User or Assistant)")
  role: MessageRole;

  /**
   * The text content of the message.
   * For assistant messages, this may be a question, explanation, or response.
   * For user messages, this contains their input or selected option text.
   */
  @doc("The text content of the message")
  content: string;

  /**
   * Optional list of choices presented to the user.
   * When the assistant needs the user to choose between specific options,
   * these are provided as an array of strings. The user can then respond
   * by setting `selectedOption` to the index of their choice.
   */
  @doc("Optional choices presented to the user for selection")
  options?: string[];

  /**
   * Optional freeform text answer from the user.
   * Used when the user provides a custom response rather than
   * selecting from predefined options, or when elaborating on
   * their selection.
   */
  @doc("Optional user's freeform text answer")
  answer?: string;

  /**
   * Optional index of the selected option (0-based).
   * When the assistant presents options and the user selects one,
   * this field contains the index into the `options` array.
   * A value of 0 means the first option was selected.
   */
  @doc("Optional index of the selected option from the options array (0-based)")
  selectedOption?: int32;
}
