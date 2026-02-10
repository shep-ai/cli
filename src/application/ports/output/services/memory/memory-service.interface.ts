/**
 * IMemoryService - Port interface for high-level memory operations
 *
 * Defines the contract for orchestrating memory storage and retrieval
 * across embeddings, vector search, and graph relationships.
 *
 * This is the primary interface for agents to interact with the memory system.
 * It coordinates between embedding generation, vector storage, and graph storage
 * to provide hybrid retrieval (semantic + graph-based).
 *
 * @example
 * ```typescript
 * class MemoryService implements IMemoryService {
 *   constructor(
 *     private embedding: IEmbeddingService,
 *     private vectorStore: IVectorStoreService,
 *     private graphStore: IGraphStoreService
 *   ) {}
 *
 *   async store(episode: Episode): Promise<void> {
 *     // 1. Generate embedding
 *     // 2. Store in vector DB
 *     // 3. Store relationships in graph
 *   }
 *
 *   async retrieve(query: string, topK: number, scope?: MemoryScope): Promise<Episode[]> {
 *     // 1. Generate query embedding
 *     // 2. Semantic search via vectors
 *     // 3. Expand via graph relationships
 *     // 4. Re-rank and return top-K
 *   }
 * }
 * ```
 */

import type { Episode, MemoryScope } from '@/domain/generated/output';

/**
 * Memory service interface for orchestrating memory operations
 */
export interface IMemoryService {
  /**
   * Store an episode in memory
   *
   * Orchestrates the full storage pipeline:
   * 1. Generate embedding for episode content
   * 2. Store episode + embedding in vector store
   * 3. Create graph relationships (context, follows-from, relates-to)
   *
   * @param episode - Episode entity to store
   * @returns Promise that resolves when storage is complete
   * @throws Error if embedding generation or storage fails
   *
   * @example
   * ```typescript
   * const episode: Episode = {
   *   id: 'ep-123',
   *   content: 'User asked about TDD workflow in Clean Architecture',
   *   scope: MemoryScope.Global,
   *   type: MemoryType.Conversation,
   *   createdAt: new Date(),
   *   ...
   * };
   * await memoryService.store(episode);
   * ```
   */
  store(episode: Episode): Promise<void>;

  /**
   * Retrieve relevant episodes using hybrid retrieval
   *
   * Combines semantic search (vector similarity) with graph traversal
   * to find the most relevant memories for a given query.
   *
   * Hybrid retrieval process:
   * 1. Generate query embedding
   * 2. Semantic search: Find top-K similar episodes via vector store
   * 3. Graph expansion: Find related episodes via graph relationships
   * 4. Re-rank combined results by relevance
   * 5. Return top-K final results
   *
   * @param query - Natural language query string
   * @param topK - Maximum number of episodes to return
   * @param scope - Optional memory scope filter (Global or Feature-specific)
   * @returns Promise resolving to array of relevant episodes (sorted by relevance)
   *
   * @example
   * ```typescript
   * // Retrieve top 5 memories about TDD from global scope
   * const memories = await memoryService.retrieve(
   *   'How do I write tests first in TDD?',
   *   5,
   *   MemoryScope.Global
   * );
   * // memories[0] is most relevant episode
   * ```
   */
  retrieve(query: string, topK: number, scope?: MemoryScope): Promise<Episode[]>;

  /**
   * Prune old memories based on retention policy
   *
   * Deletes episodes older than the specified retention period.
   * Removes episodes from both vector store and graph store.
   *
   * @param retentionDays - Number of days to retain memories (e.g., 90)
   * @returns Promise that resolves when pruning is complete
   *
   * @example
   * ```typescript
   * // Delete memories older than 90 days
   * await memoryService.pruneOldMemories(90);
   * ```
   */
  pruneOldMemories(retentionDays: number): Promise<void>;
}
