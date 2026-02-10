/**
 * VectorStoreService - LanceDB vector storage integration
 *
 * RED phase: This is a stub to allow tests to compile.
 * Implementation will be added in GREEN phase (Task 6).
 */

import type { Episode, MemoryScope } from '@/domain/generated/output';

/**
 * Search result type
 */
export interface VectorSearchResult {
  episodeId: string;
  scope: MemoryScope;
  distance: number;
}

export class VectorStoreService {
  constructor(_storageDir: string) {
    // RED phase: stub constructor
  }

  /**
   * Store or update an episode with its embedding
   */
  async upsert(_episode: Episode, _embedding: number[]): Promise<void> {
    throw new Error('Not implemented - RED phase stub');
  }

  /**
   * Search for similar episodes
   */
  async search(_queryEmbedding: number[], _limit: number): Promise<VectorSearchResult[]> {
    throw new Error('Not implemented - RED phase stub');
  }

  /**
   * Search for similar episodes filtered by scope
   */
  async searchByScope(
    _queryEmbedding: number[],
    _scope: MemoryScope,
    _limit: number
  ): Promise<VectorSearchResult[]> {
    throw new Error('Not implemented - RED phase stub');
  }

  /**
   * Delete an episode from the vector store
   */
  async delete(_episodeId: string): Promise<void> {
    throw new Error('Not implemented - RED phase stub');
  }
}
