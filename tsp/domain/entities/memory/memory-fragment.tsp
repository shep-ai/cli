import "../../../common/base.tsp";

/**
 * MemoryFragment - A snippet or segment of a conversation/interaction
 *
 * Fragments allow fine-grained retrieval and context injection.
 * Each fragment represents a meaningful piece of the episode.
 */
@doc("Memory fragment - detailed snippet from an episode")
model MemoryFragment {
  /**
   * Unique identifier for this fragment
   */
  @doc("Unique fragment ID")
  id: string;

  /**
   * Fragment content text
   */
  @doc("Text content of this fragment")
  content: string;

  /**
   * Role in conversation (user, assistant, system)
   */
  @doc("Role of the speaker")
  role?: "user" | "assistant" | "system";

  /**
   * Timestamp of this fragment within the episode
   */
  @doc("When this fragment occurred")
  timestamp: utcDateTime;

  /**
   * Order/sequence number within the episode
   */
  @doc("Sequence order within episode")
  sequence: int32;

  /**
   * Metadata key-value pairs
   */
  @doc("Additional metadata")
  metadata?: Record<string>;
}
