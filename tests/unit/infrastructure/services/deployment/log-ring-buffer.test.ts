// @vitest-environment node

/**
 * LogRingBuffer Unit Tests
 *
 * Tests for the ring buffer data structure used to accumulate deployment logs.
 * Covers push/getAll ordering, capacity eviction, wrap-around, clear, and size tracking.
 *
 * TDD Phase: RED → GREEN
 */

import { describe, it, expect } from 'vitest';
import { LogRingBuffer } from '@/infrastructure/services/deployment/log-ring-buffer.js';
import type { LogEntry } from '@/application/ports/output/services/deployment-service.interface.js';

function makeEntry(line: string, stream: 'stdout' | 'stderr' = 'stdout'): LogEntry {
  return { targetId: 'test', stream, line, timestamp: Date.now() };
}

describe('LogRingBuffer', () => {
  describe('constructor', () => {
    it('should default to capacity 5000', () => {
      const buffer = new LogRingBuffer();
      expect(buffer.capacity).toBe(5000);
    });

    it('should accept a custom capacity', () => {
      const buffer = new LogRingBuffer(100);
      expect(buffer.capacity).toBe(100);
    });
  });

  describe('push and getAll', () => {
    it('should return empty array when no entries pushed', () => {
      const buffer = new LogRingBuffer();
      expect(buffer.getAll()).toEqual([]);
    });

    it('should return entries in insertion order', () => {
      const buffer = new LogRingBuffer(10);
      const e1 = makeEntry('line 1');
      const e2 = makeEntry('line 2');
      const e3 = makeEntry('line 3');

      buffer.push(e1);
      buffer.push(e2);
      buffer.push(e3);

      expect(buffer.getAll()).toEqual([e1, e2, e3]);
    });

    it('should return all entries when count equals capacity', () => {
      const buffer = new LogRingBuffer(3);
      const entries = [makeEntry('a'), makeEntry('b'), makeEntry('c')];
      for (const e of entries) buffer.push(e);

      expect(buffer.getAll()).toEqual(entries);
    });
  });

  describe('eviction (FIFO)', () => {
    it('should evict oldest entry when buffer is full', () => {
      const buffer = new LogRingBuffer(3);
      const e1 = makeEntry('oldest');
      const e2 = makeEntry('middle');
      const e3 = makeEntry('newest');
      const e4 = makeEntry('newest+1');

      buffer.push(e1);
      buffer.push(e2);
      buffer.push(e3);
      buffer.push(e4);

      const result = buffer.getAll();
      expect(result).toEqual([e2, e3, e4]);
      expect(result).not.toContainEqual(e1);
    });

    it('should maintain chronological order after multiple wrap-arounds', () => {
      const buffer = new LogRingBuffer(3);
      const entries: LogEntry[] = [];
      for (let i = 0; i < 10; i++) {
        entries.push(makeEntry(`line ${i}`));
        buffer.push(entries[i]);
      }

      // After 10 pushes into capacity-3 buffer, only last 3 remain
      const result = buffer.getAll();
      expect(result).toEqual([entries[7], entries[8], entries[9]]);
    });

    it('should evict exactly the right number of entries', () => {
      const buffer = new LogRingBuffer(5);
      const entries: LogEntry[] = [];
      for (let i = 0; i < 8; i++) {
        entries.push(makeEntry(`line ${i}`));
        buffer.push(entries[i]);
      }

      // Capacity 5, pushed 8 → oldest 3 evicted, entries[3..7] remain
      const result = buffer.getAll();
      expect(result).toHaveLength(5);
      expect(result).toEqual(entries.slice(3));
    });
  });

  describe('size', () => {
    it('should be 0 when empty', () => {
      const buffer = new LogRingBuffer();
      expect(buffer.size).toBe(0);
    });

    it('should track pushes correctly', () => {
      const buffer = new LogRingBuffer(10);
      buffer.push(makeEntry('a'));
      expect(buffer.size).toBe(1);

      buffer.push(makeEntry('b'));
      expect(buffer.size).toBe(2);

      buffer.push(makeEntry('c'));
      expect(buffer.size).toBe(3);
    });

    it('should not exceed capacity', () => {
      const buffer = new LogRingBuffer(3);
      for (let i = 0; i < 10; i++) {
        buffer.push(makeEntry(`line ${i}`));
      }
      expect(buffer.size).toBe(3);
    });
  });

  describe('clear', () => {
    it('should empty the buffer', () => {
      const buffer = new LogRingBuffer(10);
      buffer.push(makeEntry('a'));
      buffer.push(makeEntry('b'));

      buffer.clear();

      expect(buffer.getAll()).toEqual([]);
    });

    it('should reset size to 0', () => {
      const buffer = new LogRingBuffer(10);
      buffer.push(makeEntry('a'));
      buffer.push(makeEntry('b'));

      buffer.clear();

      expect(buffer.size).toBe(0);
    });

    it('should allow pushing after clear', () => {
      const buffer = new LogRingBuffer(3);
      buffer.push(makeEntry('old'));
      buffer.clear();

      const newEntry = makeEntry('new');
      buffer.push(newEntry);

      expect(buffer.getAll()).toEqual([newEntry]);
      expect(buffer.size).toBe(1);
    });
  });

  describe('mixed stdout and stderr', () => {
    it('should preserve stream type for each entry', () => {
      const buffer = new LogRingBuffer(10);
      const out = makeEntry('stdout line', 'stdout');
      const err = makeEntry('stderr line', 'stderr');

      buffer.push(out);
      buffer.push(err);

      const result = buffer.getAll();
      expect(result[0].stream).toBe('stdout');
      expect(result[1].stream).toBe('stderr');
    });
  });
});
