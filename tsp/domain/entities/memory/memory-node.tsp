import "../../../common/base.tsp";
import "../../../common/enums/memory-scope.tsp";

/**
 * MemoryNode - Graph node representation of an episode
 *
 * Used for RDF graph storage in Quadstore. Represents an episode
 * as a node in the knowledge graph with metadata for SPARQL queries.
 */
@doc("Memory node - graph representation of an episode")
model MemoryNode extends BaseEntity {
  /**
   * Episode ID that this node represents
   */
  @doc("Associated episode ID")
  episodeId: string;

  /**
   * Node label for graph queries
   */
  @doc("Human-readable label")
  label: string;

  /**
   * Memory scope for graph isolation
   */
  @doc("Memory scope (Global or Feature-specific)")
  scope: MemoryScope;

  /**
   * Feature ID for feature-specific nodes
   */
  @doc("Feature ID (if feature-specific)")
  featureId?: string;

  /**
   * Node properties for SPARQL filtering
   */
  @doc("Node properties")
  properties?: Record<string>;
}
