/**
 * GraphStoreService - Quadstore RDF graph storage integration
 *
 * STUB: Implementation pending (TDD RED phase)
 *
 * Will implement IGraphStoreService using Quadstore for file-based RDF storage.
 */

import type { MemoryScope } from '@/domain/generated/output';
import type { IGraphStoreService, SparqlResult } from '@/application/ports/output';

export class GraphStoreService implements IGraphStoreService {
  constructor(_storageDir: string) {
    throw new Error('GraphStoreService not implemented yet (TDD RED phase)');
  }

  async addTriple(
    _subject: string,
    _predicate: string,
    _object: string,
    _scope: MemoryScope
  ): Promise<void> {
    throw new Error('Not implemented');
  }

  async query(_sparql: string, _scope?: MemoryScope): Promise<SparqlResult[]> {
    throw new Error('Not implemented');
  }

  async getRelatedEpisodes(
    _episodeId: string,
    _scope?: MemoryScope,
    _depth?: number
  ): Promise<string[]> {
    throw new Error('Not implemented');
  }

  async removeEpisode(_episodeId: string): Promise<void> {
    throw new Error('Not implemented');
  }
}
