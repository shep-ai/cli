/**
 * SPARQL Query Builder Utilities
 *
 * Provides helper functions to construct common SPARQL queries
 * for episode graph operations.
 */

import { EPISODE_PREFIX } from './graph-schema.constants';

/**
 * Build SPARQL query to find related episodes via graph traversal
 *
 * Constructs a query that finds all episodes connected to the given episode
 * through any predicate relationship (both incoming and outgoing edges).
 *
 * @param episodeId - Episode identifier (without 'episode:' prefix)
 * @returns SPARQL SELECT query string
 *
 * @example
 * ```typescript
 * const sparql = buildGetRelatedQuery('ep-123');
 * const results = await graphStore.query(sparql, scope);
 * ```
 */
export function buildGetRelatedQuery(episodeId: string): string {
  const episodeUri = `${EPISODE_PREFIX}${episodeId}`;

  return `
    SELECT DISTINCT ?related
    WHERE {
      {
        <${episodeUri}> ?p ?related .
        FILTER(STRSTARTS(STR(?related), "${EPISODE_PREFIX}"))
      }
      UNION
      {
        ?related ?p <${episodeUri}> .
        FILTER(STRSTARTS(STR(?related), "${EPISODE_PREFIX}"))
      }
    }
  `.trim();
}

/**
 * Build SPARQL DELETE query to remove all triples for an episode
 *
 * Constructs a query that deletes all triples where the episode
 * appears as either subject or object.
 *
 * @param episodeId - Episode identifier (without 'episode:' prefix)
 * @returns SPARQL DELETE query string
 *
 * @example
 * ```typescript
 * const sparql = buildDeleteQuery('ep-123');
 * // Note: Current Quadstore implementation uses quad-level deletion
 * // This query builder is provided for future SPARQL DELETE support
 * ```
 */
export function buildDeleteQuery(episodeId: string): string {
  const episodeUri = `${EPISODE_PREFIX}${episodeId}`;

  return `
    DELETE {
      ?s ?p ?o .
    }
    WHERE {
      {
        BIND(<${episodeUri}> AS ?s)
        ?s ?p ?o .
      }
      UNION
      {
        BIND(<${episodeUri}> AS ?o)
        ?s ?p ?o .
      }
    }
  `.trim();
}

/**
 * Build SPARQL query to find episodes with specific predicate
 *
 * @param predicate - RDF predicate URI
 * @returns SPARQL SELECT query string
 */
export function buildPredicateFilterQuery(predicate: string): string {
  return `
    SELECT ?subject ?object
    WHERE {
      ?subject <${predicate}> ?object .
    }
  `.trim();
}

/**
 * Build SPARQL query to count triples in a graph
 *
 * @returns SPARQL SELECT query string
 */
export function buildCountQuery(): string {
  return `
    SELECT (COUNT(*) AS ?count)
    WHERE {
      ?s ?p ?o .
    }
  `.trim();
}
