/**
 * IGraphStoreService - Port interface for graph-based memory relationships
 *
 * Defines the contract for storing and querying relationships between
 * memories using RDF triples and SPARQL. Implementations should provide
 * file-based graph storage without requiring external services.
 *
 * Uses named graphs to isolate global memories from feature-specific memories.
 *
 * @example
 * ```typescript
 * class QuadstoreGraphService implements IGraphStoreService {
 *   async addTriple(
 *     subject: string,
 *     predicate: string,
 *     object: string,
 *     scope: MemoryScope
 *   ): Promise<void> {
 *     // Store RDF triple in Quadstore
 *   }
 *
 *   async query(sparql: string, scope?: MemoryScope): Promise<SparqlResult[]> {
 *     // Execute SPARQL query
 *     return results;
 *   }
 * }
 * ```
 */

import type { MemoryScope } from '@/domain/generated/output';

/**
 * SPARQL query result row type
 * Each row is a key-value map where keys are variable names from the SELECT clause
 */
export type SparqlResult = Record<string, string>;

/**
 * Graph store service interface for managing memory relationships
 */
export interface IGraphStoreService {
  /**
   * Add an RDF triple to the graph store
   *
   * Triples are stored in named graphs based on scope:
   * - Global scope: shep:global
   * - Feature scope: shep:feature:{featureId}
   *
   * @param subject - Subject URI (e.g., 'episode:ep-123')
   * @param predicate - Predicate URI (e.g., 'shep:followsFrom', 'shep:relatesTo')
   * @param object - Object URI or literal value
   * @param scope - Memory scope for the triple
   * @returns Promise that resolves when triple is stored
   *
   * @example
   * ```typescript
   * // Create relationship: episode-2 follows from episode-1
   * await graphStore.addTriple(
   *   'episode:ep-2',
   *   'shep:followsFrom',
   *   'episode:ep-1',
   *   MemoryScope.Global
   * );
   * ```
   */
  addTriple(subject: string, predicate: string, object: string, scope: MemoryScope): Promise<void>;

  /**
   * Execute a SPARQL query against the graph store
   *
   * Supports SELECT queries to retrieve data from the graph.
   * Query is scoped to a specific named graph if scope is provided.
   *
   * @param sparql - SPARQL SELECT query string
   * @param scope - Optional memory scope to query (defaults to all scopes)
   * @returns Promise resolving to array of result rows
   *
   * @example
   * ```typescript
   * const sparql = `
   *   SELECT ?episode ?context
   *   WHERE {
   *     ?episode shep:hasContext ?context .
   *   }
   * `;
   * const results = await graphStore.query(sparql, MemoryScope.Global);
   * // results = [{ episode: 'episode:ep-1', context: 'TDD workflow' }, ...]
   * ```
   */
  query(sparql: string, scope?: MemoryScope): Promise<SparqlResult[]>;

  /**
   * Find related episodes by traversing the graph
   *
   * Follows relationships (shep:followsFrom, shep:relatesTo, shep:hasContext)
   * up to a specified depth to find connected episodes.
   *
   * @param episodeId - Starting episode identifier
   * @param scope - Optional memory scope to search within
   * @param depth - Maximum traversal depth (default: 2)
   * @returns Promise resolving to array of related episode IDs
   *
   * @example
   * ```typescript
   * // Find episodes related to ep-123 within 2 hops
   * const relatedIds = await graphStore.getRelatedEpisodes(
   *   'ep-123',
   *   MemoryScope.Global,
   *   2
   * );
   * // relatedIds = ['ep-124', 'ep-125', 'ep-130']
   * ```
   */
  getRelatedEpisodes(episodeId: string, scope?: MemoryScope, depth?: number): Promise<string[]>;

  /**
   * Remove an episode and all its relationships from the graph
   *
   * Deletes all triples where the episode appears as subject or object.
   * No-op if episode does not exist in the graph.
   *
   * @param episodeId - Episode identifier to remove
   * @returns Promise that resolves when removal is complete
   *
   * @example
   * ```typescript
   * await graphStore.removeEpisode('ep-123');
   * // All triples involving ep-123 are deleted
   * ```
   */
  removeEpisode(episodeId: string): Promise<void>;
}
