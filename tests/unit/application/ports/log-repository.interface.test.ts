/**
 * Unit test for ILogRepository interface contract
 *
 * Tests that repository implementations must conform to the ILogRepository interface.
 */

/* eslint-disable @typescript-eslint/no-empty-function */

import { describe, it, expect } from 'vitest';
import type { ILogRepository } from '../../../../src/application/ports/output/log-repository.interface.js';
import type { LogEntry, LogSearchFilters } from '../../../../src/domain/generated/output.js';

describe('ILogRepository interface contract', () => {
  it('should define save method', () => {
    // This test verifies the interface exists at compile time
    // At runtime, we check that a mock implementation has the method
    const mockRepo: ILogRepository = {
      save: async (logEntry: LogEntry): Promise<void> => {
        expect(logEntry).toBeDefined();
      },
      findById: async () => null,
      search: async () => [],
      count: async () => 0,
      deleteOlderThan: async () => 0,
    };

    expect(mockRepo.save).toBeDefined();
    expect(typeof mockRepo.save).toBe('function');
  });

  it('should define findById method', () => {
    const mockRepo: ILogRepository = {
      save: async () => {},
      findById: async (id: string): Promise<LogEntry | null> => {
        expect(id).toBeDefined();
        return null;
      },
      search: async () => [],
      count: async () => 0,
      deleteOlderThan: async () => 0,
    };

    expect(mockRepo.findById).toBeDefined();
    expect(typeof mockRepo.findById).toBe('function');
  });

  it('should define search method with filters', () => {
    const mockRepo: ILogRepository = {
      save: async () => {},
      findById: async () => null,
      search: async (filters: LogSearchFilters): Promise<LogEntry[]> => {
        expect(filters).toBeDefined();
        return [];
      },
      count: async () => 0,
      deleteOlderThan: async () => 0,
    };

    expect(mockRepo.search).toBeDefined();
    expect(typeof mockRepo.search).toBe('function');
  });

  it('should define count method with filters', () => {
    const mockRepo: ILogRepository = {
      save: async () => {},
      findById: async () => null,
      search: async () => [],
      count: async (filters: LogSearchFilters): Promise<number> => {
        expect(filters).toBeDefined();
        return 0;
      },
      deleteOlderThan: async () => 0,
    };

    expect(mockRepo.count).toBeDefined();
    expect(typeof mockRepo.count).toBe('function');
  });

  it('should define deleteOlderThan method', () => {
    const mockRepo: ILogRepository = {
      save: async () => {},
      findById: async () => null,
      search: async () => [],
      count: async () => 0,
      deleteOlderThan: async (timestamp: number): Promise<number> => {
        expect(timestamp).toBeDefined();
        return 0;
      },
    };

    expect(mockRepo.deleteOlderThan).toBeDefined();
    expect(typeof mockRepo.deleteOlderThan).toBe('function');
  });

  it('should allow all methods to be called', async () => {
    const mockRepo: ILogRepository = {
      save: async () => {},
      findById: async () => null,
      search: async () => [],
      count: async () => 0,
      deleteOlderThan: async () => 0,
    };

    const logEntry: LogEntry = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      timestamp: 1707408000000,
      level: 'info',
      source: 'test',
      message: 'Test message',
      stackTrace: null,
      createdAt: '2026-02-08T12:00:00Z',
    };

    await expect(mockRepo.save(logEntry)).resolves.toBeUndefined();
    await expect(mockRepo.findById('test-id')).resolves.toBeNull();
    await expect(mockRepo.search({})).resolves.toEqual([]);
    await expect(mockRepo.count({})).resolves.toBe(0);
    await expect(mockRepo.deleteOlderThan(Date.now())).resolves.toBe(0);
  });
});
