/**
 * Unit test for SQLiteLogRepository
 *
 * Tests the SQLite implementation of ILogRepository with mocked database.
 */

import 'reflect-metadata';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type Database from 'better-sqlite3';
import { SQLiteLogRepository } from '../../../../src/infrastructure/repositories/sqlite-log.repository.js';
import type { LogEntry } from '../../../../src/domain/generated/output.js';
import { createMockLogger } from '../../../helpers/mock-logger.js';

describe('SQLiteLogRepository (Unit)', () => {
  let mockDb: Database.Database;
  let repository: SQLiteLogRepository;
  const mockLogger = createMockLogger();

  beforeEach(() => {
    // Create mock database with minimal interface
    mockDb = {
      prepare: vi.fn(),
      exec: vi.fn(),
      transaction: vi.fn(),
    } as unknown as Database.Database;

    repository = new SQLiteLogRepository(mockDb, mockLogger);
  });

  describe('save', () => {
    it('should insert log entry into database', async () => {
      const mockRun = vi.fn();
      const mockPrepare = vi.fn().mockReturnValue({ run: mockRun });
      mockDb.prepare = mockPrepare;

      const logEntry: LogEntry = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        timestamp: 1707408000000,
        level: 'info',
        source: 'test-source',
        message: 'Test message',
        context: { userId: 'user-123' },
        stackTrace: null,
        createdAt: '2026-02-08T12:00:00Z',
      };

      await repository.save(logEntry);

      expect(mockPrepare).toHaveBeenCalled();
      expect(mockRun).toHaveBeenCalledWith({
        id: logEntry.id,
        timestamp: logEntry.timestamp,
        level: logEntry.level,
        source: logEntry.source,
        message: logEntry.message,
        context: JSON.stringify(logEntry.context),
        stack_trace: logEntry.stackTrace,
        created_at: logEntry.createdAt,
      });
    });

    it('should handle log entry without context', async () => {
      const mockRun = vi.fn();
      const mockPrepare = vi.fn().mockReturnValue({ run: mockRun });
      mockDb.prepare = mockPrepare;

      const logEntry: LogEntry = {
        id: 'test-id',
        timestamp: Date.now(),
        level: 'debug',
        source: 'test',
        message: 'Debug message',
        stackTrace: null,
        createdAt: new Date().toISOString(),
      };

      await repository.save(logEntry);

      expect(mockRun).toHaveBeenCalledWith(
        expect.objectContaining({
          context: null,
        })
      );
    });
  });

  describe('findById', () => {
    it('should return log entry when found', async () => {
      const mockGet = vi.fn().mockReturnValue({
        id: 'test-id',
        timestamp: 1707408000000,
        level: 'info',
        source: 'test',
        message: 'Test message',
        context: '{"userId":"user-123"}',
        stack_trace: null,
        created_at: '2026-02-08T12:00:00Z',
      });
      const mockPrepare = vi.fn().mockReturnValue({ get: mockGet });
      mockDb.prepare = mockPrepare;

      const result = await repository.findById('test-id');

      expect(result).not.toBeNull();
      expect(result?.id).toBe('test-id');
      expect(result?.context).toEqual({ userId: 'user-123' });
    });

    it('should return null when log entry not found', async () => {
      const mockGet = vi.fn().mockReturnValue(undefined);
      const mockPrepare = vi.fn().mockReturnValue({ get: mockGet });
      mockDb.prepare = mockPrepare;

      const result = await repository.findById('nonexistent-id');

      expect(result).toBeNull();
    });
  });

  describe('search', () => {
    it('should return all logs when no filters provided', async () => {
      const mockAll = vi.fn().mockReturnValue([
        {
          id: 'log-1',
          timestamp: 1707408000000,
          level: 'info',
          source: 'test',
          message: 'Message 1',
          context: null,
          stack_trace: null,
          created_at: '2026-02-08T12:00:00Z',
        },
      ]);
      const mockPrepare = vi.fn().mockReturnValue({ all: mockAll });
      mockDb.prepare = mockPrepare;

      const results = await repository.search({});

      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('log-1');
    });

    it('should apply level filter', async () => {
      const mockAll = vi.fn().mockReturnValue([]);
      const mockPrepare = vi.fn().mockReturnValue({ all: mockAll });
      mockDb.prepare = mockPrepare;

      await repository.search({ level: 'error' });

      const sqlCall = mockPrepare.mock.calls[0][0] as string;
      expect(sqlCall).toContain('WHERE');
      expect(sqlCall.toLowerCase()).toContain('level');
    });

    it('should apply pagination filters', async () => {
      const mockAll = vi.fn().mockReturnValue([]);
      const mockPrepare = vi.fn().mockReturnValue({ all: mockAll });
      mockDb.prepare = mockPrepare;

      await repository.search({ limit: 50, offset: 100 });

      const sqlCall = mockPrepare.mock.calls[0][0] as string;
      expect(sqlCall).toContain('LIMIT');
      expect(sqlCall).toContain('OFFSET');
    });
  });

  describe('count', () => {
    it('should return total count when no filters provided', async () => {
      const mockGet = vi.fn().mockReturnValue({ count: 42 });
      const mockPrepare = vi.fn().mockReturnValue({ get: mockGet });
      mockDb.prepare = mockPrepare;

      const count = await repository.count({});

      expect(count).toBe(42);
    });

    it('should apply filters to count', async () => {
      const mockGet = vi.fn().mockReturnValue({ count: 10 });
      const mockPrepare = vi.fn().mockReturnValue({ get: mockGet });
      mockDb.prepare = mockPrepare;

      await repository.count({ level: 'error', source: 'test' });

      const sqlCall = mockPrepare.mock.calls[0][0] as string;
      expect(sqlCall).toContain('COUNT(*)');
      expect(sqlCall.toLowerCase()).toContain('level');
      expect(sqlCall.toLowerCase()).toContain('source');
    });
  });

  describe('deleteOlderThan', () => {
    it('should delete old logs and return count', async () => {
      const mockRun = vi.fn().mockReturnValue({ changes: 15 });
      const mockPrepare = vi.fn().mockReturnValue({ run: mockRun });
      mockDb.prepare = mockPrepare;

      const deletedCount = await repository.deleteOlderThan(1707400000000);

      expect(deletedCount).toBe(15);
      expect(mockPrepare).toHaveBeenCalled();
      expect(mockRun).toHaveBeenCalledWith(1707400000000);
    });

    it('should return 0 when no logs deleted', async () => {
      const mockRun = vi.fn().mockReturnValue({ changes: 0 });
      const mockPrepare = vi.fn().mockReturnValue({ run: mockRun });
      mockDb.prepare = mockPrepare;

      const deletedCount = await repository.deleteOlderThan(Date.now());

      expect(deletedCount).toBe(0);
    });
  });
});
