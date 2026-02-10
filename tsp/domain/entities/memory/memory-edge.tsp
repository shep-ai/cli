import "../../../common/base.tsp";

/**
 * MemoryEdge - Graph relationship between episodes
 *
 * Represents an RDF triple (subject-predicate-object) in the knowledge graph.
 * Used for traversing relationships between memories.
 */
@doc("Memory edge - relationship between episodes in graph")
model MemoryEdge extends BaseEntity {
  /**
   * Source episode ID (subject in RDF)
   */
  @doc("Source episode ID")
  sourceEpisodeId: string;

  /**
   * Target episode ID (object in RDF)
   */
  @doc("Target episode ID")
  targetEpisodeId: string;

  /**
   * Relationship type (predicate in RDF)
   * Examples: hasContext, followsFrom, relatesTo, contradicts, supports
   */
  @doc("Relationship type (RDF predicate)")
  relationshipType: string;

  /**
   * Edge properties for SPARQL filtering
   */
  @doc("Edge properties")
  properties?: Record<string>;

  /**
   * Relationship strength/weight (0.0-1.0)
   */
  @doc("Relationship strength (0.0-1.0)")
  weight?: float32;
}
