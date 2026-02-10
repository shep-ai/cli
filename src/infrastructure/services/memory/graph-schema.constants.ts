/**
 * Graph Schema Constants
 *
 * Defines RDF predicates and URIs used in the memory graph store.
 * These constants ensure consistency across graph operations.
 */

/**
 * Graph URI constants for named graph isolation
 */
export const GLOBAL_GRAPH_URI = 'shep:global';
export const FEATURE_GRAPH_PREFIX = 'shep:feature:';

/**
 * RDF predicate constants for episode relationships
 */
export const PREDICATE = {
  /**
   * Indicates an episode has contextual information from another episode
   * Example: episode:ep-2 shep:hasContext episode:ep-1
   */
  HAS_CONTEXT: 'shep:hasContext',

  /**
   * Indicates temporal sequence - this episode follows from another
   * Example: episode:ep-2 shep:followsFrom episode:ep-1
   */
  FOLLOWS_FROM: 'shep:followsFrom',

  /**
   * Indicates thematic relationship between episodes
   * Example: episode:ep-2 shep:relatesTo episode:ep-1
   */
  RELATES_TO: 'shep:relatesTo',
} as const;

/**
 * Episode URI prefix
 */
export const EPISODE_PREFIX = 'episode:';

/**
 * Type for valid RDF predicates
 */
export type GraphPredicate = (typeof PREDICATE)[keyof typeof PREDICATE];
