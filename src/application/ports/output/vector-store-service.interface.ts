/**
 * IVectorStoreService - Port interface for vector storage and similarity search
 *
 * Defines the contract for storing and retrieving episode embeddings
 * using vector similarity search. Implementations should provide
 * file-based storage without requiring external services.
 *
 * @example
 * ```typescript
 * class LanceDBVectorStoreService implements IVectorStoreService {
 *   async upsert(episode: Episode, embedding: number[]): Promise<void> {
 *     // Store episode with embedding in LanceDB
 *   }
 *
 *   async search(queryEmbedding: number[], limit: number): Promise<VectorSearchResult[]> {
 *     // Search by vector similarity
 *     return results;
 *   }
 * }
 * ```
 */

import type { Episode, MemoryScope } from '@/domain/generated/output';

/**
 * Vector search result containing episode reference and similarity score
 */
export interface VectorSearchResult {
  /** Episode identifier */
  episodeId: string;
  /** Memory scope (global or feature-specific) */
  scope: MemoryScope;
  /** Distance from query vector (lower is more similar, 0 = identical) */
  distance: number;
}

/**
 * Vector store service interface for managing episode embeddings
 */
export interface IVectorStoreService {
  /**
   * Store or update an episode with its embedding vector
   *
   * If episode already exists (by ID), updates the embedding.
   * Otherwise, inserts a new record.
   *
   * @param episode - Episode entity to store
   * @param embedding - Vector embedding for the episode (must match model dimension)
   * @returns Promise that resolves when upsert is complete
   * @throws Error if embedding dimension is invalid
   *
   * @example
   * ```typescript
   * const episode: Episode = { id: 'ep-1', content: 'User asked about TDD', ... };
   * const embedding = await embeddingService.generateEmbedding(episode.content);
   * await vectorStore.upsert(episode, embedding);
   * ```
   */
  upsert(episode: Episode, embedding: number[]): Promise<void>;

  /**
   * Search for similar episodes using vector similarity
   *
   * Returns top-K most similar episodes based on cosine distance.
   * Results are sorted by distance (ascending - most similar first).
   *
   * @param queryEmbedding - Query vector to search for
   * @param limit - Maximum number of results to return
   * @returns Promise resolving to array of search results
   *
   * @example
   * ```typescript
   * const queryEmbedding = await embeddingService.generateEmbedding('TDD workflow');
   * const results = await vectorStore.search(queryEmbedding, 5);
   * // results[0] is most similar episode
   * ```
   */
  search(queryEmbedding: number[], limit: number): Promise<VectorSearchResult[]>;

  /**
   * Search for similar episodes within a specific memory scope
   *
   * Filters results to only include episodes from the specified scope
   * (e.g., only global memories or only feature-specific memories).
   *
   * @param queryEmbedding - Query vector to search for
   * @param scope - Memory scope filter (Global or Feature)
   * @param limit - Maximum number of results to return
   * @returns Promise resolving to array of search results
   *
   * @example
   * ```typescript
   * // Search only in global scope
   * const results = await vectorStore.searchByScope(
   *   queryEmbedding,
   *   MemoryScope.Global,
   *   5
   * );
   * ```
   */
  searchByScope(
    queryEmbedding: number[],
    scope: MemoryScope,
    limit: number
  ): Promise<VectorSearchResult[]>;

  /**
   * Delete an episode from the vector store
   *
   * Removes the episode and its embedding from storage.
   * No-op if episode does not exist.
   *
   * @param episodeId - Episode identifier to delete
   * @returns Promise that resolves when deletion is complete
   *
   * @example
   * ```typescript
   * await vectorStore.delete('ep-123');
   * ```
   */
  delete(episodeId: string): Promise<void>;
}
