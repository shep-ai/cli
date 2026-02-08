/**
 * EventChannel Unit Tests
 *
 * Tests for the generic async push/pull queue that bridges
 * event producers and async iteration consumers.
 */

import 'reflect-metadata';
import { describe, it, expect } from 'vitest';
import { EventChannel } from '../../../../../../src/infrastructure/services/agents/streaming/event-channel.js';

describe('EventChannel', () => {
  it('should yield pushed events in order', async () => {
    const channel = new EventChannel<string>();
    channel.push('a');
    channel.push('b');
    channel.push('c');
    channel.close();

    const results: string[] = [];
    for await (const event of channel) {
      results.push(event);
    }

    expect(results).toEqual(['a', 'b', 'c']);
  });

  it('should wait for events when queue is empty', async () => {
    const channel = new EventChannel<number>();

    // Push after a delay
    setTimeout(() => {
      channel.push(42);
      channel.close();
    }, 20);

    const results: number[] = [];
    for await (const event of channel) {
      results.push(event);
    }

    expect(results).toEqual([42]);
  });

  it('should stop iteration after close()', async () => {
    const channel = new EventChannel<string>();
    channel.close();

    const results: string[] = [];
    for await (const event of channel) {
      results.push(event);
    }

    expect(results).toEqual([]);
  });

  it('should yield buffered events before closing', async () => {
    const channel = new EventChannel<string>();
    channel.push('first');
    channel.push('second');
    channel.close();

    const results: string[] = [];
    for await (const event of channel) {
      results.push(event);
    }

    expect(results).toEqual(['first', 'second']);
  });

  it('should handle rapid push before any consumer reads', async () => {
    const channel = new EventChannel<number>();
    for (let i = 0; i < 100; i++) {
      channel.push(i);
    }
    channel.close();

    const results: number[] = [];
    for await (const event of channel) {
      results.push(event);
    }

    expect(results).toHaveLength(100);
    expect(results[0]).toBe(0);
    expect(results[99]).toBe(99);
  });

  it('should handle close() called multiple times without error', async () => {
    const channel = new EventChannel<string>();
    channel.push('event');
    channel.close();
    channel.close();
    channel.close();

    const results: string[] = [];
    for await (const event of channel) {
      results.push(event);
    }

    expect(results).toEqual(['event']);
  });

  it('should ignore push() after close()', async () => {
    const channel = new EventChannel<string>();
    channel.push('before');
    channel.close();
    channel.push('after');

    const results: string[] = [];
    for await (const event of channel) {
      results.push(event);
    }

    expect(results).toEqual(['before']);
  });

  it('should support interleaved push and consume', async () => {
    const channel = new EventChannel<string>();
    const results: string[] = [];

    const consumer = (async () => {
      for await (const event of channel) {
        results.push(event);
      }
    })();

    // Push events with small delays to ensure interleaving
    channel.push('1');
    await new Promise((r) => setTimeout(r, 5));
    channel.push('2');
    await new Promise((r) => setTimeout(r, 5));
    channel.push('3');
    channel.close();

    await consumer;

    expect(results).toEqual(['1', '2', '3']);
  });
});
