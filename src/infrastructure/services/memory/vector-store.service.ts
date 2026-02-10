/**
 * VectorStoreService - LanceDB vector storage integration
 *
 * Manages vector embeddings for episodes using LanceDB.
 * Provides similarity search and scope-based filtering.
 */

import { connect, type Connection, type Table } from '@lancedb/lancedb';
import * as arrow from 'apache-arrow';
import type { Episode, MemoryScope } from '@/domain/generated/output';

/**
 * Search result type
 */
export interface VectorSearchResult {
  episodeId: string;
  scope: MemoryScope;
  distance: number;
}

/**
 * LanceDB table row schema
 */
interface VectorTableRow {
  id: string;
  episodeId: string;
  embedding: number[];
  scope: string;
  createdAt: number;
}

export class VectorStoreService {
  private connection: Connection | null = null;
  private table: Table | null = null;
  private readonly storageDir: string;
  private readonly tableName = 'episodes';

  constructor(storageDir: string) {
    this.storageDir = storageDir;
  }

  /**
   * Initialize LanceDB connection and table
   */
  private async initialize(): Promise<void> {
    if (this.connection === null) {
      this.connection = await connect(this.storageDir);

      // Get list of existing tables
      const tableNames = await this.connection.tableNames();

      if (tableNames.includes(this.tableName)) {
        // Open existing table
        this.table = await this.connection.openTable(this.tableName);
      } else {
        // Create new table - let LanceDB infer schema from data
        // Convert Float32Array to regular array for schema inference
        const initData = [
          {
            id: 'init',
            episodeId: 'init',
            embedding: Array.from(new Float32Array(384).fill(0)),
            scope: 'global',
            createdAt: Date.now(),
          },
        ];

        this.table = await this.connection.createTable(this.tableName, initData);

        // Delete the initialization row
        await this.table.delete('id = "init"');
      }
    }
  }

  /**
   * Store or update an episode with its embedding
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
   * Search for similar episodes
   */
  async search(queryEmbedding: number[], limit: number): Promise<VectorSearchResult[]> {
    await this.initialize();

    if (!this.table) {
      throw new Error('Vector store table not initialized');
    }

    try {
      // LanceDB accepts regular arrays for search
      const results = await this.table.search(queryEmbedding).limit(limit);

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
    } catch (error) {
      // Handle empty table or search errors
      return [];
    }
  }

  /**
   * Search for similar episodes filtered by scope
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
      // LanceDB accepts regular arrays for search
      const results = await this.table
        .search(queryEmbedding)
        .filter(`scope = "${scope}"`)
        .limit(limit);

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
    } catch (error) {
      // Handle empty table or search errors
      return [];
    }
  }

  /**
   * Delete an episode from the vector store
   */
  async delete(episodeId: string): Promise<void> {
    await this.initialize();

    if (!this.table) {
      throw new Error('Vector store table not initialized');
    }

    await this.table.delete(`episodeId = "${episodeId}"`);
  }
}
