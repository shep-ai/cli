/**
 * Integration test for SQLiteLogRepository
 *
 * Tests the SQLite implementation with a real in-memory database.
 */

import 'reflect-metadata';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { SQLiteLogRepository } from '../../../src/infrastructure/repositories/sqlite-log.repository.js';
import { runSQLiteMigrations } from '../../../src/infrastructure/persistence/sqlite/migrations.js';
import type { LogEntry, LogSearchFilters } from '../../../src/domain/generated/output.js';
import { createMockLogger } from '../../helpers/mock-logger.js';

describe('SQLiteLogRepository (Integration)', () => {
  let db: Database.Database;
  let repository: SQLiteLogRepository;
  const mockLogger = createMockLogger();

  beforeEach(async () => {
    // Create in-memory database
    db = new Database(':memory:');

    // Run migrations to set up schema
    await runSQLiteMigrations(db);

    // Create repository instance
    repository = new SQLiteLogRepository(db, mockLogger);
  });

  afterEach(() => {
    db.close();
  });

  describe('save and findById', () => {
    it('should save and retrieve log entry', async () => {
      const logEntry: LogEntry = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        timestamp: 1707408000000,
        level: 'info',
        source: 'test-source',
        message: 'Test log message',
        context: { userId: 'user-123', action: 'test' },
        stackTrace: null,
        createdAt: '2026-02-08T12:00:00Z',
      };

      await repository.save(logEntry);

      const retrieved = await repository.findById(logEntry.id);

      expect(retrieved).not.toBeNull();
      expect(retrieved?.id).toBe(logEntry.id);
      expect(retrieved?.timestamp).toBe(logEntry.timestamp);
      expect(retrieved?.level).toBe(logEntry.level);
      expect(retrieved?.source).toBe(logEntry.source);
      expect(retrieved?.message).toBe(logEntry.message);
      expect(retrieved?.context).toEqual(logEntry.context);
      expect(retrieved?.stackTrace).toBeNull();
    });

    it('should save log entry without context', async () => {
      const logEntry: LogEntry = {
        id: 'no-context-id',
        timestamp: Date.now(),
        level: 'debug',
        source: 'test',
        message: 'No context message',
        stackTrace: null,
        createdAt: new Date().toISOString(),
      };

      await repository.save(logEntry);

      const retrieved = await repository.findById(logEntry.id);

      expect(retrieved).not.toBeNull();
      expect(retrieved?.context).toBeUndefined();
    });

    it('should save log entry with stack trace', async () => {
      const logEntry: LogEntry = {
        id: 'error-with-stack',
        timestamp: Date.now(),
        level: 'error',
        source: 'test',
        message: 'Error occurred',
        context: { errorCode: 'TEST_ERROR' },
        stackTrace: 'Error: Test error\n  at Function.test',
        createdAt: new Date().toISOString(),
      };

      await repository.save(logEntry);

      const retrieved = await repository.findById(logEntry.id);

      expect(retrieved).not.toBeNull();
      expect(retrieved?.stackTrace).toBe(logEntry.stackTrace);
    });

    it('should return null for nonexistent ID', async () => {
      const retrieved = await repository.findById('nonexistent-id');

      expect(retrieved).toBeNull();
    });
  });

  describe('search', () => {
    beforeEach(async () => {
      // Insert test data
      const testLogs: LogEntry[] = [
        {
          id: 'log-1',
          timestamp: 1707408000000,
          level: 'debug',
          source: 'cli:settings',
          message: 'Debug message 1',
          stackTrace: null,
          createdAt: '2026-02-08T12:00:00Z',
        },
        {
          id: 'log-2',
          timestamp: 1707408001000,
          level: 'info',
          source: 'cli:settings',
          message: 'Info message 2',
          stackTrace: null,
          createdAt: '2026-02-08T12:00:01Z',
        },
        {
          id: 'log-3',
          timestamp: 1707408002000,
          level: 'warn',
          source: 'use-case:agent',
          message: 'Warning message 3',
          stackTrace: null,
          createdAt: '2026-02-08T12:00:02Z',
        },
        {
          id: 'log-4',
          timestamp: 1707408003000,
          level: 'error',
          source: 'use-case:agent',
          message: 'Error message 4',
          context: { errorCode: 'TEST' },
          stackTrace: 'Error: Test\n  at test',
          createdAt: '2026-02-08T12:00:03Z',
        },
      ];

      for (const log of testLogs) {
        await repository.save(log);
      }
    });

    it('should return all logs when no filters provided', async () => {
      const results = await repository.search({});

      expect(results).toHaveLength(4);
      // Should be ordered by timestamp DESC (most recent first)
      expect(results[0].id).toBe('log-4');
      expect(results[3].id).toBe('log-1');
    });

    it('should filter by log level', async () => {
      const filters: LogSearchFilters = { level: 'error' };
      const results = await repository.search(filters);

      expect(results).toHaveLength(1);
      expect(results[0].level).toBe('error');
      expect(results[0].id).toBe('log-4');
    });

    it('should filter by source', async () => {
      const filters: LogSearchFilters = { source: 'cli:settings' };
      const results = await repository.search(filters);

      expect(results).toHaveLength(2);
      expect(results.every((log) => log.source === 'cli:settings')).toBe(true);
    });

    it('should filter by time range', async () => {
      const filters: LogSearchFilters = {
        startTime: 1707408001000,
        endTime: 1707408002000,
      };
      const results = await repository.search(filters);

      expect(results).toHaveLength(2);
      expect(results.map((log) => log.id).sort()).toEqual(['log-2', 'log-3']);
    });

    it('should apply pagination', async () => {
      const page1 = await repository.search({ limit: 2, offset: 0 });
      const page2 = await repository.search({ limit: 2, offset: 2 });

      expect(page1).toHaveLength(2);
      expect(page2).toHaveLength(2);
      expect(page1[0].id).toBe('log-4');
      expect(page1[1].id).toBe('log-3');
      expect(page2[0].id).toBe('log-2');
      expect(page2[1].id).toBe('log-1');
    });

    it('should combine multiple filters', async () => {
      const filters: LogSearchFilters = {
        source: 'use-case:agent',
        level: 'error',
        limit: 10,
      };
      const results = await repository.search(filters);

      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('log-4');
      expect(results[0].source).toBe('use-case:agent');
      expect(results[0].level).toBe('error');
    });

    it('should use default limit of 50', async () => {
      // Insert 60 logs
      for (let i = 0; i < 60; i++) {
        await repository.save({
          id: `bulk-log-${i}`,
          timestamp: Date.now() + i,
          level: 'info',
          source: 'test',
          message: `Bulk message ${i}`,
          stackTrace: null,
          createdAt: new Date().toISOString(),
        });
      }

      const results = await repository.search({});

      expect(results.length).toBeLessThanOrEqual(50);
    });
  });

  describe('count', () => {
    beforeEach(async () => {
      // Insert test data
      for (let i = 0; i < 10; i++) {
        await repository.save({
          id: `count-log-${i}`,
          timestamp: Date.now() + i,
          level: i % 2 === 0 ? 'info' : 'error',
          source: i % 3 === 0 ? 'cli:settings' : 'use-case:agent',
          message: `Count message ${i}`,
          stackTrace: null,
          createdAt: new Date().toISOString(),
        });
      }
    });

    it('should count all logs', async () => {
      const count = await repository.count({});

      expect(count).toBe(10);
    });

    it('should count logs by level', async () => {
      const errorCount = await repository.count({ level: 'error' });

      expect(errorCount).toBe(5);
    });

    it('should count logs by source', async () => {
      const cliCount = await repository.count({ source: 'cli:settings' });

      expect(cliCount).toBe(4); // indices 0, 3, 6, 9
    });

    it('should count logs with combined filters', async () => {
      const count = await repository.count({
        level: 'error',
        source: 'use-case:agent',
      });

      expect(count).toBeGreaterThan(0);
    });
  });

  describe('deleteOlderThan', () => {
    beforeEach(async () => {
      // Insert logs with different timestamps
      const baseTime = 1707400000000;

      for (let i = 0; i < 10; i++) {
        await repository.save({
          id: `delete-log-${i}`,
          timestamp: baseTime + i * 1000,
          level: 'info',
          source: 'test',
          message: `Delete message ${i}`,
          stackTrace: null,
          createdAt: new Date(baseTime + i * 1000).toISOString(),
        });
      }
    });

    it('should delete logs older than threshold', async () => {
      const threshold = 1707400005000; // After 5th log
      const deletedCount = await repository.deleteOlderThan(threshold);

      expect(deletedCount).toBe(5); // logs 0-4

      const remainingCount = await repository.count({});
      expect(remainingCount).toBe(5); // logs 5-9
    });

    it('should delete all logs if threshold is in future', async () => {
      const threshold = Date.now() + 100000;
      const deletedCount = await repository.deleteOlderThan(threshold);

      expect(deletedCount).toBe(10);

      const remainingCount = await repository.count({});
      expect(remainingCount).toBe(0);
    });

    it('should delete no logs if threshold is in distant past', async () => {
      const threshold = 1000000000000; // Very old timestamp
      const deletedCount = await repository.deleteOlderThan(threshold);

      expect(deletedCount).toBe(0);

      const remainingCount = await repository.count({});
      expect(remainingCount).toBe(10);
    });
  });

  describe('FTS5 search via search method', () => {
    beforeEach(async () => {
      // Insert logs for full-text search
      await repository.save({
        id: 'fts-1',
        timestamp: Date.now(),
        level: 'info',
        source: 'test',
        message: 'The quick brown fox jumps over the lazy dog',
        stackTrace: null,
        createdAt: new Date().toISOString(),
      });

      await repository.save({
        id: 'fts-2',
        timestamp: Date.now() + 1,
        level: 'info',
        source: 'test',
        message: 'A lazy cat sleeps on the windowsill',
        stackTrace: null,
        createdAt: new Date().toISOString(),
      });
    });

    it('should find logs by FTS5 search (verified via manual query)', () => {
      // FTS5 search will be implemented in the repository
      // This test verifies that FTS5 is working via the migration triggers

      const ftsResults = db
        .prepare('SELECT id FROM logs_fts WHERE message MATCH ?')
        .all('lazy') as { id: string }[];

      expect(ftsResults).toHaveLength(2);
      expect(ftsResults.map((r) => r.id).sort()).toEqual(['fts-1', 'fts-2']);
    });
  });
});
