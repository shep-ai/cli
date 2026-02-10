/**
 * Vector Store Service Integration Tests
 *
 * Tests for LanceDB vector storage integration.
 * Verifies vector storage, similarity search, and persistence.
 *
 * TDD Phase: RED
 * - Tests written BEFORE implementation
 * - All tests should FAIL initially
 */

import 'reflect-metadata';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { join } from 'path';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import type { Episode } from '@/domain/generated/output';
import { MemoryScope, MemoryType } from '@/domain/generated/output';
import { VectorStoreService } from '@/infrastructure/services/memory/vector-store.service';

describe('VectorStoreService', () => {
  let vectorStore: VectorStoreService;
  let tempDir: string;

  // Sample test data
  const createTestEpisode = (id: string, scope: MemoryScope): Episode => ({
    id,
    content: `Test episode content ${id}`,
    summary: `Summary for ${id}`,
    scope,
    type: MemoryType.Conversation,
    featureId: 'test-feature-001',
    fragments: [
      {
        id: `${id}-fragment-1`,
        content: 'User message',
        role: 'user',
        timestamp: new Date('2026-02-10T19:00:00Z'),
        sequence: 0,
      },
    ],
    hasEmbedding: true,
    relatedEpisodes: [],
    tags: ['test'],
    importance: 0.8,
    createdAt: new Date('2026-02-10T19:00:00Z'),
    updatedAt: new Date('2026-02-10T19:00:00Z'),
  });

  const create384DimEmbedding = (): number[] => {
    return Array.from({ length: 384 }, () => Math.random());
  };

  beforeEach(async () => {
    // Create temporary directory for LanceDB
    tempDir = mkdtempSync(join(tmpdir(), 'lancedb-test-'));

    // RED: VectorStoreService doesn't exist yet
    vectorStore = new VectorStoreService(tempDir);
  });

  afterEach(() => {
    // Clean up temporary directory
    rmSync(tempDir, { recursive: true, force: true });
  });

  describe('upsert()', () => {
    it('should store episode with embedding', async () => {
      // RED: This test should FAIL because VectorStoreService doesn't exist
      const episode = createTestEpisode('ep-001', MemoryScope.Global);
      const embedding = create384DimEmbedding();

      await vectorStore.upsert(episode, embedding);

      // Verify stored by searching
      const results = await vectorStore.search(embedding, 1);
      expect(results).toBeDefined();
      expect(results.length).toBe(1);
      expect(results[0].episodeId).toBe('ep-001');
    });

    it('should update existing episode embedding', async () => {
      // RED: This test should FAIL
      const episode = createTestEpisode('ep-002', MemoryScope.Global);
      const embedding1 = create384DimEmbedding();
      const embedding2 = create384DimEmbedding();

      // Insert first
      await vectorStore.upsert(episode, embedding1);

      // Update with new embedding
      await vectorStore.upsert(episode, embedding2);

      // Should only have one entry
      const results = await vectorStore.search(embedding2, 5);
      const ep002Results = results.filter((r) => r.episodeId === 'ep-002');
      expect(ep002Results.length).toBe(1);
    });
  });

  describe('search()', () => {
    it('should retrieve top-5 similar episodes', async () => {
      // RED: This test should FAIL
      const episodes = [
        createTestEpisode('ep-001', MemoryScope.Global),
        createTestEpisode('ep-002', MemoryScope.Global),
        createTestEpisode('ep-003', MemoryScope.Feature),
        createTestEpisode('ep-004', MemoryScope.Global),
        createTestEpisode('ep-005', MemoryScope.Feature),
        createTestEpisode('ep-006', MemoryScope.Global),
      ];

      // Store all episodes
      for (const episode of episodes) {
        await vectorStore.upsert(episode, create384DimEmbedding());
      }

      // Search with a query embedding
      const queryEmbedding = create384DimEmbedding();
      const results = await vectorStore.search(queryEmbedding, 5);

      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeLessThanOrEqual(5);
      results.forEach((result) => {
        expect(result.episodeId).toBeDefined();
        expect(result.scope).toBeDefined();
        expect(result.distance).toBeDefined();
        expect(typeof result.distance).toBe('number');
      });
    });

    it('should return empty array when no episodes exist', async () => {
      // RED: This test should FAIL
      const queryEmbedding = create384DimEmbedding();
      const results = await vectorStore.search(queryEmbedding, 5);

      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(0);
    });
  });

  describe('searchByScope()', () => {
    it('should filter by MemoryScope.Global', async () => {
      // RED: This test should FAIL
      const episodes = [
        createTestEpisode('ep-global-1', MemoryScope.Global),
        createTestEpisode('ep-feature-1', MemoryScope.Feature),
        createTestEpisode('ep-global-2', MemoryScope.Global),
        createTestEpisode('ep-feature-2', MemoryScope.Feature),
      ];

      // Store all episodes
      for (const episode of episodes) {
        await vectorStore.upsert(episode, create384DimEmbedding());
      }

      // Search only global scope
      const queryEmbedding = create384DimEmbedding();
      const results = await vectorStore.searchByScope(queryEmbedding, MemoryScope.Global, 10);

      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(2);
      results.forEach((result) => {
        expect(result.scope).toBe(MemoryScope.Global);
      });
    });

    it('should filter by MemoryScope.Feature', async () => {
      // RED: This test should FAIL
      const episodes = [
        createTestEpisode('ep-global-1', MemoryScope.Global),
        createTestEpisode('ep-feature-1', MemoryScope.Feature),
        createTestEpisode('ep-feature-2', MemoryScope.Feature),
      ];

      // Store all episodes
      for (const episode of episodes) {
        await vectorStore.upsert(episode, create384DimEmbedding());
      }

      // Search only feature scope
      const queryEmbedding = create384DimEmbedding();
      const results = await vectorStore.searchByScope(queryEmbedding, MemoryScope.Feature, 10);

      expect(results).toBeDefined();
      expect(results.length).toBe(2);
      results.forEach((result) => {
        expect(result.scope).toBe(MemoryScope.Feature);
      });
    });
  });

  describe('delete()', () => {
    it('should remove episode from vector store', async () => {
      // RED: This test should FAIL
      const episode = createTestEpisode('ep-delete-001', MemoryScope.Global);
      const embedding = create384DimEmbedding();

      // Store episode
      await vectorStore.upsert(episode, embedding);

      // Verify it exists
      const beforeDelete = await vectorStore.search(embedding, 5);
      const beforeCount = beforeDelete.filter((r) => r.episodeId === 'ep-delete-001').length;
      expect(beforeCount).toBe(1);

      // Delete episode
      await vectorStore.delete('ep-delete-001');

      // Verify it's gone
      const afterDelete = await vectorStore.search(embedding, 5);
      const afterCount = afterDelete.filter((r) => r.episodeId === 'ep-delete-001').length;
      expect(afterCount).toBe(0);
    });
  });

  describe('file persistence', () => {
    it('should persist data across service restarts', async () => {
      // RED: This test should FAIL
      const episode = createTestEpisode('ep-persist-001', MemoryScope.Global);
      const embedding = create384DimEmbedding();

      // Store episode with first service instance
      await vectorStore.upsert(episode, embedding);

      // Create new service instance pointing to same directory
      const vectorStore2 = new VectorStoreService(tempDir);

      // Search with new instance - data should still exist
      const results = await vectorStore2.search(embedding, 5);
      expect(results).toBeDefined();
      const persistedResults = results.filter((r) => r.episodeId === 'ep-persist-001');
      expect(persistedResults.length).toBe(1);
      expect(persistedResults[0].episodeId).toBe('ep-persist-001');
      expect(persistedResults[0].scope).toBe(MemoryScope.Global);
    });
  });
});
