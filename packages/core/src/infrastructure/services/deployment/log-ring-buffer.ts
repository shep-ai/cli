/**
 * LogRingBuffer — Fixed-capacity circular buffer for deployment log entries.
 *
 * Provides O(1) append with automatic eviction of the oldest entry when full.
 * getAll() returns entries in chronological (insertion) order.
 */

import type { LogEntry } from '@/application/ports/output/services/deployment-service.interface.js';

const DEFAULT_CAPACITY = 5000;

export class LogRingBuffer {
  readonly capacity: number;
  private buffer: LogEntry[];
  private writeIndex = 0;
  private count = 0;

  constructor(capacity: number = DEFAULT_CAPACITY) {
    this.capacity = capacity;
    this.buffer = [];
  }

  /** Append a log entry. Evicts the oldest entry when at capacity. */
  push(entry: LogEntry): void {
    if (this.count < this.capacity) {
      this.buffer.push(entry);
      this.count++;
    } else {
      this.buffer[this.writeIndex] = entry;
    }
    this.writeIndex = (this.writeIndex + 1) % this.capacity;
  }

  /** Return all entries in chronological order. */
  getAll(): LogEntry[] {
    if (this.count < this.capacity) {
      return this.buffer.slice();
    }
    // Buffer is full and may have wrapped — writeIndex points to the oldest entry
    return [...this.buffer.slice(this.writeIndex), ...this.buffer.slice(0, this.writeIndex)];
  }

  /** Remove all entries and reset the buffer. */
  clear(): void {
    this.buffer = [];
    this.writeIndex = 0;
    this.count = 0;
  }

  /** Current number of entries in the buffer. */
  get size(): number {
    return this.count;
  }
}
