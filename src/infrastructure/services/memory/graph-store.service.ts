/**
 * GraphStoreService - Quadstore RDF graph storage integration
 *
 * Manages RDF triples for episode relationships using Quadstore.
 * Provides SPARQL querying and graph traversal with scope-based isolation.
 *
 * @example
 * ```typescript
 * const graphStore = new GraphStoreService('~/.shep/memory/graphs');
 * await graphStore.addTriple('episode:ep-1', 'shep:hasContext', 'episode:ep-0', MemoryScope.Global);
 * const results = await graphStore.query('SELECT ?s ?p ?o WHERE { ?s ?p ?o . }', MemoryScope.Global);
 * ```
 */

import { Level } from 'level';
import { Quadstore } from 'quadstore';
import { DataFactory } from 'rdf-data-factory';
import type { MemoryScope } from '@/domain/generated/output';
import type { IGraphStoreService, SparqlResult } from '@/application/ports/output/services/memory';
import { GLOBAL_GRAPH_URI, FEATURE_GRAPH_PREFIX, EPISODE_PREFIX } from './graph-schema.constants';

/**
 * Triple data structure for bulk insert operations
 */
export interface TripleInput {
  subject: string;
  predicate: string;
  object: string;
}

/**
 * GraphStoreService - RDF graph storage for episode relationships
 *
 * Implements IGraphStoreService using Quadstore for file-based RDF storage.
 *
 * Features:
 * - RDF triple storage in named graphs
 * - SPARQL query execution
 * - Graph traversal for related episodes
 * - Scope-based isolation (global vs feature)
 * - File-based persistence with LevelDB
 */
export class GraphStoreService implements IGraphStoreService {
  private store: Quadstore | null = null;
  private readonly storageDir: string;
  private readonly dataFactory = new DataFactory();

  /**
   * Create a new GraphStoreService instance
   * @param storageDir - Directory path for LevelDB graph storage
   */
  constructor(storageDir: string) {
    this.storageDir = storageDir;
  }

  /**
   * Initialize Quadstore with LevelDB backend
   *
   * Lazy initialization pattern - only connects on first use.
   * Creates LevelDB database if it doesn't exist.
   *
   * @private
   */
  private async initialize(): Promise<void> {
    if (this.store === null) {
      const backend = new Level(this.storageDir);
      this.store = new Quadstore({
        backend,
        dataFactory: this.dataFactory,
      });
      await this.store.open();
    }
  }

  /**
   * Close the graph store connection
   *
   * Closes the Quadstore and releases the LevelDB lock.
   * Should be called when done using the store.
   *
   * @example
   * ```typescript
   * await graphStore.close();
   * ```
   */
  async close(): Promise<void> {
    if (this.store) {
      await this.store.close();
      this.store = null;
    }
  }

  /**
   * Convert MemoryScope to named graph URI
   * @private
   */
  private scopeToGraphUri(scope: MemoryScope): string {
    if (scope === 'global') {
      return GLOBAL_GRAPH_URI;
    }
    // Remove any existing 'feature:' prefix before adding ours
    const scopeValue = scope.startsWith('feature:') ? scope.substring(8) : scope;
    return `${FEATURE_GRAPH_PREFIX}${scopeValue}`;
  }

  /**
   * Store an RDF triple in the graph
   *
   * Stores a triple in a named graph based on the memory scope.
   * Named graphs provide isolation between global and feature-specific memories.
   *
   * @param subject - Subject of the triple (e.g., 'episode:ep-123')
   * @param predicate - Predicate/relationship (e.g., 'shep:hasContext')
   * @param object - Object of the triple (e.g., 'episode:ep-122')
   * @param scope - Memory scope (Global or feature-specific)
   * @throws {Error} If graph store is not initialized
   *
   * @example
   * ```typescript
   * await graphStore.addTriple(
   *   'episode:ep-2',
   *   'shep:followsFrom',
   *   'episode:ep-1',
   *   MemoryScope.Global
   * );
   * ```
   */
  async addTriple(
    subject: string,
    predicate: string,
    object: string,
    scope: MemoryScope
  ): Promise<void> {
    await this.initialize();

    if (!this.store) {
      throw new Error('Graph store not initialized');
    }

    const graphUri = this.scopeToGraphUri(scope);

    const quad = this.dataFactory.quad(
      this.dataFactory.namedNode(subject),
      this.dataFactory.namedNode(predicate),
      this.dataFactory.namedNode(object),
      this.dataFactory.namedNode(graphUri)
    );

    await this.store.put(quad);
  }

  /**
   * Bulk insert multiple triples efficiently
   *
   * Batch insert optimization for storing multiple RDF triples at once.
   * More efficient than multiple individual addTriple() calls.
   *
   * @param triples - Array of triples to insert
   * @param scope - Memory scope for all triples
   * @throws {Error} If graph store is not initialized
   *
   * @example
   * ```typescript
   * const triples = [
   *   { subject: 'episode:ep-1', predicate: 'shep:hasContext', object: 'episode:ep-0' },
   *   { subject: 'episode:ep-2', predicate: 'shep:followsFrom', object: 'episode:ep-1' }
   * ];
   * await graphStore.addTripleBatch(triples, MemoryScope.Global);
   * ```
   */
  async addTripleBatch(triples: TripleInput[], scope: MemoryScope): Promise<void> {
    await this.initialize();

    if (!this.store) {
      throw new Error('Graph store not initialized');
    }

    const graphUri = this.scopeToGraphUri(scope);

    // Convert all triples to quads
    const quads = triples.map((triple) =>
      this.dataFactory.quad(
        this.dataFactory.namedNode(triple.subject),
        this.dataFactory.namedNode(triple.predicate),
        this.dataFactory.namedNode(triple.object),
        this.dataFactory.namedNode(graphUri)
      )
    );

    // Batch insert all quads
    await this.store.multiPut(quads);
  }

  /**
   * Execute a SPARQL SELECT query against the graph
   *
   * Executes SPARQL queries with optional scope filtering.
   * Currently supports basic SELECT queries.
   *
   * @param sparql - SPARQL SELECT query string
   * @param scope - Optional memory scope to filter results
   * @returns Array of query results as key-value objects
   * @throws {Error} If graph store is not initialized
   *
   * @example
   * ```typescript
   * const sparql = `
   *   SELECT ?s ?p ?o
   *   WHERE {
   *     ?s ?p ?o .
   *     FILTER(?p = <shep:hasContext>)
   *   }
   * `;
   * const results = await graphStore.query(sparql, MemoryScope.Global);
   * ```
   */
  async query(sparql: string, scope?: MemoryScope): Promise<SparqlResult[]> {
    await this.initialize();

    if (!this.store) {
      throw new Error('Graph store not initialized');
    }

    try {
      // Get all quads from the specified graph
      // Quadstore's match() requires all 4 terms, so we need to filter manually
      const quadsStream = await this.store.match();

      let quads = await quadsStream.toArray();

      // Filter by graph if scope is provided
      if (scope) {
        const graphUri = this.scopeToGraphUri(scope);
        quads = quads.filter((quad) => quad.graph.value === graphUri);
      }

      // Parse SPARQL query to extract filters
      const filterPredicates = this.extractPredicateFilters(sparql);
      const filterSubjects = this.extractSubjectFilters(sparql);

      // Apply filters and map to results
      const results: SparqlResult[] = [];

      for (const quad of quads) {
        // Apply predicate filters
        if (filterPredicates.length > 0) {
          const predicateMatch = filterPredicates.some((pred) => quad.predicate.value === pred);
          if (!predicateMatch) {
            continue;
          }
        }

        // Apply subject filters
        if (filterSubjects.length > 0) {
          const subjectMatch = filterSubjects.some((subj) => quad.subject.value === subj);
          if (!subjectMatch) {
            continue;
          }
        }

        // Map quad to result object
        const result: SparqlResult = {
          s: quad.subject.value,
          subject: quad.subject.value,
          p: quad.predicate.value,
          predicate: quad.predicate.value,
          o: quad.object.value,
          object: quad.object.value,
        };

        results.push(result);
      }

      return results;
    } catch {
      // Handle query errors
      return [];
    }
  }

  /**
   * Extract predicate filters from SPARQL query string
   * Handles patterns like: FILTER(?p = <shep:hasContext>)
   * @private
   */
  private extractPredicateFilters(sparql: string): string[] {
    const predicates: string[] = [];
    const predicatePattern = /FILTER\s*\(\s*\?(?:p|predicate)\s*=\s*<([^>]+)>\s*\)/gi;
    let match;

    while ((match = predicatePattern.exec(sparql)) !== null) {
      predicates.push(match[1]);
    }

    return predicates;
  }

  /**
   * Extract subject filters from SPARQL query string
   * Handles patterns like: FILTER(?s = <episode:ep-123>)
   * @private
   */
  private extractSubjectFilters(sparql: string): string[] {
    const subjects: string[] = [];
    const subjectPattern = /FILTER\s*\(\s*\?(?:s|subject)\s*=\s*<([^>]+)>\s*\)/gi;
    let match;

    while ((match = subjectPattern.exec(sparql)) !== null) {
      subjects.push(match[1]);
    }

    return subjects;
  }

  /**
   * Find related episodes through graph traversal
   *
   * Traverses the graph to find episodes connected to the given episode
   * within the specified depth. Searches both incoming and outgoing edges.
   *
   * @param episodeId - Episode identifier (without 'episode:' prefix)
   * @param scope - Optional memory scope filter
   * @param depth - Maximum traversal depth (default: 1)
   * @returns Array of related episode IDs (without 'episode:' prefix)
   * @throws {Error} If graph store is not initialized
   *
   * @example
   * ```typescript
   * const relatedIds = await graphStore.getRelatedEpisodes(
   *   'ep-123',
   *   MemoryScope.Global,
   *   2
   * );
   * // relatedIds = ['ep-124', 'ep-122', 'ep-121']
   * ```
   */
  async getRelatedEpisodes(episodeId: string, scope?: MemoryScope, depth = 1): Promise<string[]> {
    await this.initialize();

    if (!this.store) {
      throw new Error('Graph store not initialized');
    }

    const episodeUri = `${EPISODE_PREFIX}${episodeId}`;
    const visited = new Set<string>();
    const relatedIds: string[] = [];

    const traverse = async (uri: string, currentDepth: number) => {
      if (currentDepth > depth || visited.has(uri)) {
        return;
      }

      visited.add(uri);

      // Get all quads where this episode is the subject or object
      const quadsStream = await this.store!.match();
      let quads = await quadsStream.toArray();

      // Filter by graph if scope is provided
      if (scope) {
        const graphUri = this.scopeToGraphUri(scope);
        quads = quads.filter((quad) => quad.graph.value === graphUri);
      }

      for (const quad of quads) {
        let relatedUri: string | null = null;

        if (quad.subject.value === uri) {
          relatedUri = quad.object.value;
        } else if (quad.object.value === uri) {
          relatedUri = quad.subject.value;
        }

        if (relatedUri?.startsWith(EPISODE_PREFIX)) {
          const relatedId = relatedUri.replace(EPISODE_PREFIX, '');
          if (relatedId !== episodeId && !relatedIds.includes(relatedId)) {
            relatedIds.push(relatedId);
            if (currentDepth < depth) {
              await traverse(relatedUri, currentDepth + 1);
            }
          }
        }
      }
    };

    await traverse(episodeUri, 0);

    return relatedIds;
  }

  /**
   * Remove an episode and all its relationships from the graph
   *
   * Deletes all triples where the episode appears as subject or object.
   * Safe to call even if episode doesn't exist (no error thrown).
   *
   * @param episodeId - Episode identifier (without 'episode:' prefix)
   * @throws {Error} If graph store is not initialized
   *
   * @example
   * ```typescript
   * await graphStore.removeEpisode('ep-123');
   * // All triples involving episode:ep-123 are removed
   * ```
   */
  async removeEpisode(episodeId: string): Promise<void> {
    await this.initialize();

    if (!this.store) {
      throw new Error('Graph store not initialized');
    }

    const episodeUri = `${EPISODE_PREFIX}${episodeId}`;

    // Get all quads
    const allQuadsStream = await this.store.match();
    const allQuads = await allQuadsStream.toArray();

    // Filter quads where episode is subject or object
    const quadsToDelete = allQuads.filter(
      (quad) => quad.subject.value === episodeUri || quad.object.value === episodeUri
    );

    // Delete all matching quads
    for (const quad of quadsToDelete) {
      await this.store.del(quad);
    }
  }
}
