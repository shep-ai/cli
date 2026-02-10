/**
 * Integration tests for GraphStoreService
 *
 * Tests RDF graph storage using Quadstore with LevelDB backend.
 * Verifies triple storage, SPARQL queries, graph traversal, and named graph isolation.
 */

import 'reflect-metadata';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { GraphStoreService } from '@/infrastructure/services/memory/graph-store.service';
import { MemoryScope } from '@/domain/generated/output';

describe('GraphStoreService - Integration Tests', () => {
  let graphStore: GraphStoreService;
  let tempDir: string;

  beforeEach(() => {
    // Create temporary directory for Quadstore LevelDB storage
    tempDir = mkdtempSync(join(tmpdir(), 'graph-store-test-'));
    graphStore = new GraphStoreService(tempDir);
  });

  afterEach(() => {
    // Clean up temporary directory
    rmSync(tempDir, { recursive: true, force: true });
  });

  describe('addTriple', () => {
    it('should store RDF triple in the graph store', async () => {
      // Arrange
      const subject = 'episode:ep-123';
      const predicate = 'shep:hasContext';
      const object = 'episode:ep-122';
      const scope = MemoryScope.Global;

      // Act
      await graphStore.addTriple(subject, predicate, object, scope);

      // Assert
      // Query to verify triple was stored
      const sparql = `
        SELECT ?s ?p ?o
        WHERE {
          ?s ?p ?o .
          FILTER(?s = <${subject}>)
        }
      `;
      const results = await graphStore.query(sparql, scope);

      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        s: subject,
        p: predicate,
        o: object,
      });
    });

    it('should store multiple triples for the same subject', async () => {
      // Arrange
      const subject = 'episode:ep-123';
      const scope = MemoryScope.Global;

      // Act
      await graphStore.addTriple(subject, 'shep:hasContext', 'episode:ep-122', scope);
      await graphStore.addTriple(subject, 'shep:followsFrom', 'episode:ep-121', scope);
      await graphStore.addTriple(subject, 'shep:relatesTo', 'episode:ep-120', scope);

      // Assert
      const sparql = `
        SELECT ?p ?o
        WHERE {
          <${subject}> ?p ?o .
        }
      `;
      const results = await graphStore.query(sparql, scope);

      expect(results).toHaveLength(3);
    });
  });

  describe('query', () => {
    it('should execute SPARQL SELECT query and return results', async () => {
      // Arrange
      const scope = MemoryScope.Global;
      await graphStore.addTriple('episode:ep-1', 'shep:hasContext', 'episode:ep-0', scope);
      await graphStore.addTriple('episode:ep-2', 'shep:hasContext', 'episode:ep-1', scope);
      await graphStore.addTriple('episode:ep-3', 'shep:followsFrom', 'episode:ep-2', scope);

      // Act
      const sparql = `
        SELECT ?subject ?predicate ?object
        WHERE {
          ?subject ?predicate ?object .
          FILTER(?predicate = <shep:hasContext>)
        }
      `;
      const results = await graphStore.query(sparql, scope);

      // Assert
      expect(results).toHaveLength(2);
      expect(results).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            subject: 'episode:ep-1',
            predicate: 'shep:hasContext',
            object: 'episode:ep-0',
          }),
          expect.objectContaining({
            subject: 'episode:ep-2',
            predicate: 'shep:hasContext',
            object: 'episode:ep-1',
          }),
        ])
      );
    });

    it('should return empty array for query with no matches', async () => {
      // Arrange
      const scope = MemoryScope.Global;
      await graphStore.addTriple('episode:ep-1', 'shep:hasContext', 'episode:ep-0', scope);

      // Act
      const sparql = `
        SELECT ?s ?p ?o
        WHERE {
          ?s ?p ?o .
          FILTER(?p = <shep:nonexistent>)
        }
      `;
      const results = await graphStore.query(sparql, scope);

      // Assert
      expect(results).toEqual([]);
    });
  });

  describe('getRelatedEpisodes', () => {
    it('should traverse graph to find related episodes (depth 1)', async () => {
      // Arrange
      const scope = MemoryScope.Global;
      // Build a simple chain: ep-0 <- ep-1 <- ep-2
      await graphStore.addTriple('episode:ep-1', 'shep:followsFrom', 'episode:ep-0', scope);
      await graphStore.addTriple('episode:ep-2', 'shep:followsFrom', 'episode:ep-1', scope);

      // Act
      const relatedIds = await graphStore.getRelatedEpisodes('ep-1', scope, 1);

      // Assert
      expect(relatedIds).toHaveLength(2);
      expect(relatedIds).toEqual(expect.arrayContaining(['ep-0', 'ep-2']));
    });

    it('should traverse graph to find related episodes (depth 2)', async () => {
      // Arrange
      const scope = MemoryScope.Global;
      // Build a chain: ep-0 <- ep-1 <- ep-2 <- ep-3
      await graphStore.addTriple('episode:ep-1', 'shep:followsFrom', 'episode:ep-0', scope);
      await graphStore.addTriple('episode:ep-2', 'shep:followsFrom', 'episode:ep-1', scope);
      await graphStore.addTriple('episode:ep-3', 'shep:followsFrom', 'episode:ep-2', scope);

      // Act
      const relatedIds = await graphStore.getRelatedEpisodes('ep-2', scope, 2);

      // Assert
      // ep-2 connects to ep-1 (depth 1) and ep-3 (depth 1)
      // ep-1 connects to ep-0 (depth 2)
      expect(relatedIds).toHaveLength(3);
      expect(relatedIds).toEqual(expect.arrayContaining(['ep-1', 'ep-3', 'ep-0']));
    });

    it('should return empty array if episode has no relationships', async () => {
      // Arrange
      const scope = MemoryScope.Global;
      await graphStore.addTriple('episode:ep-1', 'shep:followsFrom', 'episode:ep-0', scope);

      // Act
      const relatedIds = await graphStore.getRelatedEpisodes('ep-999', scope, 1);

      // Assert
      expect(relatedIds).toEqual([]);
    });
  });

  describe('removeEpisode', () => {
    it('should delete episode and all related triples', async () => {
      // Arrange
      const scope = MemoryScope.Global;
      await graphStore.addTriple('episode:ep-1', 'shep:hasContext', 'episode:ep-0', scope);
      await graphStore.addTriple('episode:ep-2', 'shep:followsFrom', 'episode:ep-1', scope);
      await graphStore.addTriple('episode:ep-1', 'shep:relatesTo', 'episode:ep-3', scope);

      // Act
      await graphStore.removeEpisode('ep-1');

      // Assert
      // Query for any triples involving ep-1
      const sparql = `
        SELECT ?s ?p ?o
        WHERE {
          ?s ?p ?o .
          FILTER(?s = <episode:ep-1> || ?o = <episode:ep-1>)
        }
      `;
      const results = await graphStore.query(sparql, scope);

      expect(results).toEqual([]);
    });

    it('should not affect unrelated episodes', async () => {
      // Arrange
      const scope = MemoryScope.Global;
      await graphStore.addTriple('episode:ep-1', 'shep:hasContext', 'episode:ep-0', scope);
      await graphStore.addTriple('episode:ep-2', 'shep:followsFrom', 'episode:ep-3', scope);

      // Act
      await graphStore.removeEpisode('ep-1');

      // Assert
      const sparql = `
        SELECT ?s ?p ?o
        WHERE {
          <episode:ep-2> ?p ?o .
        }
      `;
      const results = await graphStore.query(sparql, scope);

      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        s: 'episode:ep-2',
        p: 'shep:followsFrom',
        o: 'episode:ep-3',
      });
    });
  });

  describe('Named Graphs - Scope Isolation', () => {
    it('should isolate global scope from feature scope', async () => {
      // Arrange
      const globalScope = MemoryScope.Global;
      const featureScope = 'feature:auth-system' as MemoryScope;

      // Add triples to different scopes
      await graphStore.addTriple(
        'episode:global-1',
        'shep:hasContext',
        'episode:global-0',
        globalScope
      );
      await graphStore.addTriple(
        'episode:feature-1',
        'shep:hasContext',
        'episode:feature-0',
        featureScope
      );

      // Act - Query global scope
      const globalSparql = `
        SELECT ?s ?p ?o
        WHERE {
          ?s ?p ?o .
        }
      `;
      const globalResults = await graphStore.query(globalSparql, globalScope);

      // Act - Query feature scope
      const featureResults = await graphStore.query(globalSparql, featureScope);

      // Assert
      expect(globalResults).toHaveLength(1);
      expect(globalResults[0]).toMatchObject({
        s: 'episode:global-1',
        o: 'episode:global-0',
      });

      expect(featureResults).toHaveLength(1);
      expect(featureResults[0]).toMatchObject({
        s: 'episode:feature-1',
        o: 'episode:feature-0',
      });
    });

    it('should support multiple feature scopes independently', async () => {
      // Arrange
      const featureA = 'feature:auth' as MemoryScope;
      const featureB = 'feature:payment' as MemoryScope;

      await graphStore.addTriple('episode:auth-1', 'shep:hasContext', 'episode:auth-0', featureA);
      await graphStore.addTriple('episode:pay-1', 'shep:hasContext', 'episode:pay-0', featureB);

      // Act
      const authResults = await graphStore.query(`SELECT ?s ?p ?o WHERE { ?s ?p ?o . }`, featureA);
      const payResults = await graphStore.query(`SELECT ?s ?p ?o WHERE { ?s ?p ?o . }`, featureB);

      // Assert
      expect(authResults).toHaveLength(1);
      expect(authResults[0].s).toBe('episode:auth-1');

      expect(payResults).toHaveLength(1);
      expect(payResults[0].s).toBe('episode:pay-1');
    });
  });

  describe('File Persistence', () => {
    it('should persist triples across service restarts', async () => {
      // Arrange
      const scope = MemoryScope.Global;
      await graphStore.addTriple('episode:ep-1', 'shep:hasContext', 'episode:ep-0', scope);
      await graphStore.addTriple('episode:ep-2', 'shep:followsFrom', 'episode:ep-1', scope);

      // Close the first instance to release the database lock
      await graphStore.close();

      // Act - Create a new instance pointing to same directory (simulates restart)
      const graphStore2 = new GraphStoreService(tempDir);

      const sparql = `
        SELECT ?s ?p ?o
        WHERE {
          ?s ?p ?o .
        }
      `;
      const results = await graphStore2.query(sparql, scope);

      // Assert
      expect(results).toHaveLength(2);
      expect(results).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            s: 'episode:ep-1',
            p: 'shep:hasContext',
            o: 'episode:ep-0',
          }),
          expect.objectContaining({
            s: 'episode:ep-2',
            p: 'shep:followsFrom',
            o: 'episode:ep-1',
          }),
        ])
      );
    });
  });
});
