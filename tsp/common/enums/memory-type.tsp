/**
 * MemoryType - Categorizes the type of episode content
 *
 * Conversation: Dialog/interaction between user and agent
 * Decision: A decision made during execution (architectural, implementation)
 * Pattern: A recurring pattern observed across interactions
 * Learning: A learned fact or understanding
 */
@doc("Memory type enum - categorizes episode content")
enum MemoryType {
  /**
   * Conversation episode - dialog/interaction
   */
  @doc("Conversation type")
  Conversation: "conversation",

  /**
   * Decision episode - a decision made
   */
  @doc("Decision type")
  Decision: "decision",

  /**
   * Pattern episode - recurring pattern
   */
  @doc("Pattern type")
  Pattern: "pattern",

  /**
   * Learning episode - learned fact/understanding
   */
  @doc("Learning type")
  Learning: "learning",
}
