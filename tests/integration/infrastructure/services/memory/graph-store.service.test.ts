/**
 * Graph Store Service Integration Tests
 *
 * Tests for Quadstore RDF graph storage integration.
 * Verifies triple storage, SPARQL queries, relationship traversal, and persistence.
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
import { MemoryScope } from '@/domain/generated/output';
import { GraphStoreService } from '@/infrastructure/services/memory/graph-store.service';

describe('GraphStoreService', () => {
  let graphStore: GraphStoreService;
  let tempDir: string;

  beforeEach(async () => {
    // Create temporary directory for Quadstore LevelDB
    tempDir = mkdtempSync(join(tmpdir(), 'quadstore-test-'));

    // RED: GraphStoreService doesn't exist yet
    graphStore = new GraphStoreService(tempDir);
  });

  afterEach(() => {
    // Clean up temporary directory
    rmSync(tempDir, { recursive: true, force: true });
  });

  describe('addTriple()', () => {
    it('should store RDF triple (subject-predicate-object)', async () => {
      // RED: This test should FAIL because GraphStoreService doesn't exist
      await graphStore.addTriple(
        'shep:episode:ep-001',
        'shep:relatesTo',
        'shep:episode:ep-002',
        MemoryScope.Global
      );

      // Verify triple was stored by querying
      const results = await graphStore.query(`
        SELECT ?object WHERE {
          <shep:episode:ep-001> <shep:relatesTo> ?object
        }
      `);

      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(1);
      expect(results[0].object).toBe('shep:episode:ep-002');
    });

    it('should store triple with literal object', async () => {
      // RED: This test should FAIL
      await graphStore.addTriple(
        'shep:episode:ep-001',
        'shep:hasTag',
        '"machine-learning"',
        MemoryScope.Global
      );

      const results = await graphStore.query(`
        SELECT ?tag WHERE {
          <shep:episode:ep-001> <shep:hasTag> ?tag
        }
      `);

      expect(results.length).toBe(1);
      expect(results[0].tag).toBe('"machine-learning"');
    });
  });

  describe('query()', () => {
    it('should execute SPARQL query and return results', async () => {
      // RED: This test should FAIL
      // Add test data
      await graphStore.addTriple(
        'shep:episode:ep-001',
        'shep:followsFrom',
        'shep:episode:ep-002',
        MemoryScope.Global
      );
      await graphStore.addTriple(
        'shep:episode:ep-002',
        'shep:followsFrom',
        'shep:episode:ep-003',
        MemoryScope.Global
      );

      // Query for all followsFrom relationships
      const results = await graphStore.query(`
        SELECT ?subject ?object WHERE {
          ?subject <shep:followsFrom> ?object
        }
      `);

      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(2);
    });

    it('should return empty array for query with no matches', async () => {
      // RED: This test should FAIL
      const results = await graphStore.query(`
        SELECT ?subject ?object WHERE {
          ?subject <shep:nonExistent> ?object
        }
      `);

      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(0);
    });
  });

  describe('getRelatedEpisodes()', () => {
    it('should find directly related episodes', async () => {
      // RED: This test should FAIL
      // Create relationship graph
      await graphStore.addTriple(
        'shep:episode:ep-001',
        'shep:relatesTo',
        'shep:episode:ep-002',
        MemoryScope.Global
      );
      await graphStore.addTriple(
        'shep:episode:ep-001',
        'shep:followsFrom',
        'shep:episode:ep-003',
        MemoryScope.Global
      );

      // Get related episodes
      const related = await graphStore.getRelatedEpisodes('ep-001');

      expect(related).toBeDefined();
      expect(Array.isArray(related)).toBe(true);
      expect(related.length).toBe(2);
      expect(related).toContain('ep-002');
      expect(related).toContain('ep-003');
    });

    it('should traverse multi-hop relationships', async () => {
      // RED: This test should FAIL
      // Create chain: ep-001 -> ep-002 -> ep-003
      await graphStore.addTriple(
        'shep:episode:ep-001',
        'shep:followsFrom',
        'shep:episode:ep-002',
        MemoryScope.Global
      );
      await graphStore.addTriple(
        'shep:episode:ep-002',
        'shep:followsFrom',
        'shep:episode:ep-003',
        MemoryScope.Global
      );

      // Get related episodes (should include ep-002 and ep-003)
      const related = await graphStore.getRelatedEpisodes('ep-001', MemoryScope.Global, 2);

      expect(related).toBeDefined();
      expect(related.length).toBeGreaterThanOrEqual(2);
      expect(related).toContain('ep-002');
      expect(related).toContain('ep-003');
    });

    it('should return empty array when no relationships exist', async () => {
      // RED: This test should FAIL
      const related = await graphStore.getRelatedEpisodes('ep-nonexistent');

      expect(related).toBeDefined();
      expect(Array.isArray(related)).toBe(true);
      expect(related.length).toBe(0);
    });
  });

  describe('removeEpisode()', () => {
    it('should delete episode and all related triples', async () => {
      // RED: This test should FAIL
      // Add triples involving ep-001
      await graphStore.addTriple(
        'shep:episode:ep-001',
        'shep:relatesTo',
        'shep:episode:ep-002',
        MemoryScope.Global
      );
      await graphStore.addTriple(
        'shep:episode:ep-003',
        'shep:relatesTo',
        'shep:episode:ep-001',
        MemoryScope.Global
      );

      // Verify triples exist
      const beforeResults = await graphStore.query(`
        SELECT ?s ?p ?o WHERE {
          { <shep:episode:ep-001> ?p ?o } UNION
          { ?s ?p <shep:episode:ep-001> }
        }
      `);
      expect(beforeResults.length).toBe(2);

      // Remove episode
      await graphStore.removeEpisode('ep-001');

      // Verify all triples removed
      const afterResults = await graphStore.query(`
        SELECT ?s ?p ?o WHERE {
          { <shep:episode:ep-001> ?p ?o } UNION
          { ?s ?p <shep:episode:ep-001> }
        }
      `);
      expect(afterResults.length).toBe(0);
    });
  });

  describe('named graphs (scope isolation)', () => {
    it('should isolate global vs feature-specific graphs', async () => {
      // RED: This test should FAIL
      // Add triple to global graph
      await graphStore.addTriple(
        'shep:episode:ep-global',
        'shep:hasScope',
        '"global"',
        MemoryScope.Global
      );

      // Add triple to feature graph
      await graphStore.addTriple(
        'shep:episode:ep-feature',
        'shep:hasScope',
        '"feature"',
        MemoryScope.Feature
      );

      // Query global graph only
      const globalResults = await graphStore.query(
        `
        SELECT ?subject WHERE {
          ?subject <shep:hasScope> ?scope
        }
      `,
        MemoryScope.Global
      );

      expect(globalResults.length).toBe(1);
      expect(globalResults[0].subject).toContain('ep-global');

      // Query feature graph only
      const featureResults = await graphStore.query(
        `
        SELECT ?subject WHERE {
          ?subject <shep:hasScope> ?scope
        }
      `,
        MemoryScope.Feature
      );

      expect(featureResults.length).toBe(1);
      expect(featureResults[0].subject).toContain('ep-feature');
    });

    it('should query across all graphs when scope not specified', async () => {
      // RED: This test should FAIL
      await graphStore.addTriple(
        'shep:episode:ep-001',
        'shep:type',
        '"episode"',
        MemoryScope.Global
      );
      await graphStore.addTriple(
        'shep:episode:ep-002',
        'shep:type',
        '"episode"',
        MemoryScope.Feature
      );

      // Query without scope filter
      const allResults = await graphStore.query(`
        SELECT ?subject WHERE {
          ?subject <shep:type> "episode"
        }
      `);

      expect(allResults.length).toBe(2);
    });
  });

  describe('file persistence', () => {
    it('should persist data across service restarts', async () => {
      // RED: This test should FAIL
      // Add triple with first service instance
      await graphStore.addTriple(
        'shep:episode:ep-persist',
        'shep:relatesTo',
        'shep:episode:ep-other',
        MemoryScope.Global
      );

      // Create new service instance pointing to same directory
      const graphStore2 = new GraphStoreService(tempDir);

      // Query with new instance - data should still exist
      const results = await graphStore2.query(`
        SELECT ?object WHERE {
          <shep:episode:ep-persist> <shep:relatesTo> ?object
        }
      `);

      expect(results).toBeDefined();
      expect(results.length).toBe(1);
      expect(results[0].object).toBe('shep:episode:ep-other');
    });
  });
});
