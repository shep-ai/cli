/**
 * Unit test for LogEntry domain model
 *
 * Tests the TypeSpec-generated LogEntry type and its properties.
 */

import { describe, it, expect } from 'vitest';
import type { LogEntry, LogSearchFilters } from '../../../src/domain/generated/output.js';

describe('LogEntry (TypeSpec-generated)', () => {
  it('should have all required properties', () => {
    const logEntry: LogEntry = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      timestamp: 1707408000000,
      level: 'info',
      source: 'test-source',
      message: 'Test log message',
      context: {},
      stackTrace: null,
      createdAt: '2026-02-08T12:00:00Z',
    };

    expect(logEntry.id).toBeDefined();
    expect(logEntry.timestamp).toBeDefined();
    expect(logEntry.level).toBeDefined();
    expect(logEntry.source).toBeDefined();
    expect(logEntry.message).toBeDefined();
    expect(logEntry.createdAt).toBeDefined();
  });

  it('should allow optional context property', () => {
    const logEntryWithoutContext: LogEntry = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      timestamp: 1707408000000,
      level: 'error',
      source: 'test-source',
      message: 'Error message',
      stackTrace: null,
      createdAt: '2026-02-08T12:00:00Z',
    };

    expect(logEntryWithoutContext.context).toBeUndefined();
  });

  it('should allow optional stackTrace property', () => {
    const logEntryWithStackTrace: LogEntry = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      timestamp: 1707408000000,
      level: 'error',
      source: 'test-source',
      message: 'Error with stack trace',
      context: { error: 'details' },
      stackTrace: 'Error: Something went wrong\n  at Function.test',
      createdAt: '2026-02-08T12:00:00Z',
    };

    expect(logEntryWithStackTrace.stackTrace).toBeDefined();
    expect(typeof logEntryWithStackTrace.stackTrace).toBe('string');
  });

  it('should support all log levels', () => {
    const levels: ('debug' | 'info' | 'warn' | 'error')[] = ['debug', 'info', 'warn', 'error'];

    levels.forEach((level) => {
      const logEntry: LogEntry = {
        id: `${level}-id`,
        timestamp: Date.now(),
        level,
        source: 'test',
        message: `${level} message`,
        stackTrace: null,
        createdAt: new Date().toISOString(),
      };

      expect(logEntry.level).toBe(level);
    });
  });
});

describe('LogSearchFilters (TypeSpec-generated)', () => {
  it('should have all optional filter properties', () => {
    const filters: LogSearchFilters = {
      level: 'error',
      source: 'test-source',
      startTime: 1707400000000,
      endTime: 1707410000000,
      limit: 100,
      offset: 0,
    };

    expect(filters.level).toBe('error');
    expect(filters.source).toBe('test-source');
    expect(filters.startTime).toBe(1707400000000);
    expect(filters.endTime).toBe(1707410000000);
    expect(filters.limit).toBe(100);
    expect(filters.offset).toBe(0);
  });

  it('should allow empty filters', () => {
    const filters: LogSearchFilters = {};

    expect(filters).toBeDefined();
    expect(Object.keys(filters)).toHaveLength(0);
  });

  it('should allow partial filters', () => {
    const levelOnly: LogSearchFilters = {
      level: 'warn',
    };

    const timeRangeOnly: LogSearchFilters = {
      startTime: 1707400000000,
      endTime: 1707410000000,
    };

    expect(levelOnly.level).toBe('warn');
    expect(levelOnly.source).toBeUndefined();

    expect(timeRangeOnly.startTime).toBeDefined();
    expect(timeRangeOnly.level).toBeUndefined();
  });
});
