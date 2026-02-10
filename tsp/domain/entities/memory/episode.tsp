import "../../../common/base.tsp";
import "../../../common/scalars.tsp";
import "../../../common/enums/memory-scope.tsp";
import "../../../common/enums/memory-type.tsp";
import "./memory-fragment.tsp";

/**
 * Episode - Main memory unit representing a significant interaction or learning event
 *
 * An episode captures a complete interaction (conversation, decision, pattern) with context,
 * relationships, and metadata for retrieval and graph traversal.
 */
@doc("Episode entity - main memory unit for agent interactions")
model Episode extends BaseEntity {
  /**
   * Episode content - the main text/data of this memory
   */
  @doc("Main content of the episode")
  content: string;

  /**
   * Summary of the episode for quick scanning
   */
  @doc("Brief summary for quick reference")
  summary?: string;

  /**
   * Memory scope - global across all features or feature-specific
   */
  @doc("Scope of this memory (Global or Feature-specific)")
  scope: MemoryScope;

  /**
   * Memory type - categorization of episode content
   */
  @doc("Type of memory episode")
  type: MemoryType;

  /**
   * Feature ID - present if scope is Feature-specific
   */
  @doc("Associated feature ID (if feature-specific)")
  featureId?: string;

  /**
   * Conversation fragments - detailed snippets from the interaction
   */
  @doc("Detailed fragments of the conversation")
  fragments: MemoryFragment[];

  /**
   * Embedding vector (384-dimensional for mxbai-embed-xsmall-v1)
   * Stored separately in vector database, this is just metadata
   */
  @doc("Flag indicating if embedding exists in vector store")
  hasEmbedding: boolean;

  /**
   * Related episode IDs - graph relationships
   */
  @doc("IDs of related episodes (graph edges)")
  relatedEpisodes?: string[];

  /**
   * Tags for categorical filtering
   */
  @doc("Tags for categorization and filtering")
  tags?: string[];

  /**
   * Importance score (0.0-1.0) for pruning decisions
   */
  @doc("Importance score for retention (0.0-1.0)")
  importance?: float32;
}
