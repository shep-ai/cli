/**
 * VectorStoreService - LanceDB vector storage integration
 *
 * Manages vector embeddings for episodes using LanceDB.
 * Provides similarity search and scope-based filtering.
 *
 * @example
 * ```typescript
 * const vectorStore = new VectorStoreService('~/.shep/memory/vectors');
 * await vectorStore.upsert(episode, embedding);
 * const results = await vectorStore.search(queryEmbedding, 5);
 * ```
 */

import { connect, type Connection, type Table } from '@lancedb/lancedb';
import type { Episode, MemoryScope } from '@/domain/generated/output';
import type {
  IVectorStoreService,
  VectorSearchResult,
} from '@/application/ports/output/services/memory';

/**
 * Vector store configuration constants
 */
const TABLE_NAME = 'episodes';
const EMBEDDING_DIM = 384;
const INIT_ROW_ID = 'init';

/**
 * LanceDB table row schema
 * @internal
 */
interface VectorTableRow {
  id: string;
  episodeId: string;
  embedding: number[];
  scope: string;
  createdAt: number;
}

/**
 * VectorStoreService - Local-first vector database for episode embeddings
 *
 * Implements IVectorStoreService using LanceDB for file-based vector storage.
 *
 * Features:
 * - Semantic similarity search via cosine distance
 * - Scope-based filtering (global vs feature-specific)
 * - Automatic upsert behavior (update or insert)
 * - File-based persistence with LanceDB
 */
export class VectorStoreService implements IVectorStoreService {
  private connection: Connection | null = null;
  private table: Table | null = null;
  private readonly storageDir: string;

  /**
   * Create a new VectorStoreService instance
   * @param storageDir - Directory path for LanceDB vector storage
   */
  constructor(storageDir: string) {
    this.storageDir = storageDir;
  }

  /**
   * Initialize LanceDB connection and table
   *
   * Lazy initialization pattern - only connects on first use.
   * Creates table with schema inference if it doesn't exist.
   *
   * @private
   */
  private async initialize(): Promise<void> {
    if (this.connection === null) {
      this.connection = await connect(this.storageDir);

      // Get list of existing tables
      const tableNames = await this.connection.tableNames();

      if (tableNames.includes(TABLE_NAME)) {
        // Open existing table
        this.table = await this.connection.openTable(TABLE_NAME);
      } else {
        // Create new table with schema inference from initialization row
        const initData = [
          {
            id: INIT_ROW_ID,
            episodeId: INIT_ROW_ID,
            embedding: Array.from(new Float32Array(EMBEDDING_DIM).fill(0)),
            scope: 'global',
            createdAt: Date.now(),
          },
        ];

        this.table = await this.connection.createTable(TABLE_NAME, initData);

        // Delete the initialization row after schema is established
        await this.table.delete(`id = "${INIT_ROW_ID}"`);
      }
    }
  }

  /**
   * Store or update an episode with its vector embedding
   *
   * Implements upsert pattern: deletes existing entry if found, then inserts new entry.
   * This ensures we only maintain one embedding per episode.
   *
   * @param episode - Episode entity to store
   * @param embedding - 384-dimensional embedding vector
   * @throws {Error} If vector store table is not initialized
   *
   * @example
   * ```typescript
   * const episode = { id: 'ep-001', scope: 'global', ... };
   * const embedding = await embeddingService.generateEmbedding(episode.content);
   * await vectorStore.upsert(episode, embedding);
   * ```
   */
  async upsert(episode: Episode, embedding: number[]): Promise<void> {
    await this.initialize();

    if (!this.table) {
      throw new Error('Vector store table not initialized');
    }

    // Delete existing entry if it exists (upsert pattern)
    try {
      await this.table.delete(`episodeId = "${episode.id}"`);
    } catch {
      // Entry doesn't exist, that's fine
    }

    // Insert new entry
    const row = {
      id: `${episode.id}-${Date.now()}`,
      episodeId: episode.id,
      embedding: Array.isArray(embedding) ? embedding : Array.from(embedding),
      scope: episode.scope,
      createdAt: episode.createdAt.getTime(),
    };

    await this.table.add([row]);
  }

  /**
   * Search for similar episodes using semantic similarity
   *
   * Performs vector similarity search using cosine distance.
   * Returns episodes ranked by similarity (lower distance = more similar).
   *
   * @param queryEmbedding - 384-dimensional query vector
   * @param limit - Maximum number of results to return
   * @returns Array of search results with episode IDs, scopes, and distances
   * @throws {Error} If vector store table is not initialized
   *
   * @example
   * ```typescript
   * const queryEmbedding = await embeddingService.generateEmbedding('user query');
   * const results = await vectorStore.search(queryEmbedding, 5);
   * // results[0].episodeId, results[0].distance
   * ```
   */
  async search(queryEmbedding: number[], limit: number): Promise<VectorSearchResult[]> {
    await this.initialize();

    if (!this.table) {
      throw new Error('Vector store table not initialized');
    }

    try {
      // LanceDB search returns a query builder - call toArray() to execute
      const results = await this.table.search(queryEmbedding).limit(limit).toArray();

      // Handle empty table case
      if (!results || !Array.isArray(results)) {
        return [];
      }

      return results.map((row: unknown) => {
        const typedRow = row as VectorTableRow & { _distance: number };
        return {
          episodeId: typedRow.episodeId,
          scope: typedRow.scope as MemoryScope,
          distance: typedRow._distance,
        };
      });
    } catch {
      // Handle empty table or search errors
      return [];
    }
  }

  /**
   * Search for similar episodes filtered by memory scope
   *
   * Performs semantic similarity search with scope filtering.
   * Useful for isolating global memories from feature-specific memories.
   *
   * @param queryEmbedding - 384-dimensional query vector
   * @param scope - Memory scope to filter by (global or feature)
   * @param limit - Maximum number of results to return
   * @returns Array of search results matching the scope filter
   * @throws {Error} If vector store table is not initialized
   *
   * @example
   * ```typescript
   * // Search only global memories
   * const results = await vectorStore.searchByScope(
   *   queryEmbedding,
   *   MemoryScope.Global,
   *   5
   * );
   * ```
   */
  async searchByScope(
    queryEmbedding: number[],
    scope: MemoryScope,
    limit: number
  ): Promise<VectorSearchResult[]> {
    await this.initialize();

    if (!this.table) {
      throw new Error('Vector store table not initialized');
    }

    try {
      // LanceDB search returns a query builder - call toArray() to execute
      const results = await this.table
        .search(queryEmbedding)
        .filter(`scope = "${scope}"`)
        .limit(limit)
        .toArray();

      // Handle empty table case
      if (!results || !Array.isArray(results)) {
        return [];
      }

      return results.map((row: unknown) => {
        const typedRow = row as VectorTableRow & { _distance: number };
        return {
          episodeId: typedRow.episodeId,
          scope: typedRow.scope as MemoryScope,
          distance: typedRow._distance,
        };
      });
    } catch {
      // Handle empty table or search errors
      return [];
    }
  }

  /**
   * Delete an episode and its embedding from the vector store
   *
   * Removes all vector entries associated with the given episode ID.
   * Safe to call even if episode doesn't exist (no error thrown).
   *
   * @param episodeId - Episode identifier to delete
   * @throws {Error} If vector store table is not initialized
   *
   * @example
   * ```typescript
   * await vectorStore.delete('ep-001');
   * // Episode embedding removed from vector store
   * ```
   */
  async delete(episodeId: string): Promise<void> {
    await this.initialize();

    if (!this.table) {
      throw new Error('Vector store table not initialized');
    }

    await this.table.delete(`episodeId = "${episodeId}"`);
  }
}
