/**
 * SSE API Route Integration Tests
 *
 * Tests for the GET /api/agent-events SSE endpoint that streams
 * notification events from the notification bus to connected clients.
 *
 * These tests exercise the route handler directly (not via HTTP)
 * to verify SSE formatting, filtering, and cleanup behavior.
 */

import 'reflect-metadata';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  getNotificationBus,
  resetNotificationBus,
} from '@/infrastructure/services/notifications/notification-bus.js';
import { NotificationEventType, NotificationSeverity } from '@/domain/generated/output.js';
import type { NotificationEvent } from '@/domain/generated/output.js';

function createTestEvent(overrides?: Partial<NotificationEvent>): NotificationEvent {
  return {
    eventType: NotificationEventType.AgentCompleted,
    agentRunId: 'run-123',
    featureName: 'Test Feature',
    message: 'Agent completed successfully',
    severity: NotificationSeverity.Success,
    timestamp: '2026-02-17T10:00:00.000Z',
    ...overrides,
  };
}

/**
 * Helper to read chunks from a ReadableStream until aborted or limit reached.
 */
async function readSSEChunks(
  body: ReadableStream<Uint8Array>,
  signal: AbortSignal,
  maxChunks = 10
): Promise<string[]> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  const chunks: string[] = [];

  try {
    while (chunks.length < maxChunks) {
      if (signal.aborted) break;
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(decoder.decode(value, { stream: true }));
    }
  } catch {
    // Expected when stream is cancelled
  } finally {
    reader.releaseLock();
  }

  return chunks;
}

describe('SSE API Route: GET /api/agent-events', () => {
  // eslint-disable-next-line @typescript-eslint/consistent-type-imports
  let routeModule: typeof import('@/presentation/web/app/api/agent-events/route.js');

  beforeEach(async () => {
    resetNotificationBus();
    // Dynamic import to get a fresh module (route handler uses getNotificationBus)
    routeModule = await import('@/presentation/web/app/api/agent-events/route.js');
  });

  afterEach(() => {
    resetNotificationBus();
    vi.restoreAllMocks();
  });

  it('should return response with text/event-stream content type', async () => {
    const controller = new AbortController();
    const request = new Request('http://localhost:3000/api/agent-events', {
      signal: controller.signal,
    });

    const response = await routeModule.GET(request);

    expect(response.headers.get('Content-Type')).toBe('text/event-stream');
    expect(response.headers.get('Cache-Control')).toBe('no-cache');
    expect(response.headers.get('Connection')).toBe('keep-alive');

    // Clean up
    controller.abort();
  });

  it('should stream emitted notification events as SSE-formatted data', async () => {
    const controller = new AbortController();
    const request = new Request('http://localhost:3000/api/agent-events', {
      signal: controller.signal,
    });

    const response = await routeModule.GET(request);
    const body = response.body!;

    // Emit a notification event after a short delay
    const testEvent = createTestEvent();
    const bus = getNotificationBus();

    // Start reading in background
    const chunksPromise = readSSEChunks(body, controller.signal, 2);

    // Give the stream time to set up, then emit
    await new Promise((r) => setTimeout(r, 50));
    bus.emit('notification', testEvent);

    // Wait a bit for the event to be written
    await new Promise((r) => setTimeout(r, 50));
    controller.abort();

    const chunks = await chunksPromise;
    const allData = chunks.join('');

    expect(allData).toContain('event: notification');
    expect(allData).toContain(`data: ${JSON.stringify(testEvent)}`);
  });

  it('should filter events by runId when query parameter is provided', async () => {
    const controller = new AbortController();
    const request = new Request('http://localhost:3000/api/agent-events?runId=run-456', {
      signal: controller.signal,
    });

    const response = await routeModule.GET(request);
    const body = response.body!;

    const bus = getNotificationBus();

    const chunksPromise = readSSEChunks(body, controller.signal, 3);

    await new Promise((r) => setTimeout(r, 50));

    // Emit event with different runId — should be filtered out
    bus.emit('notification', createTestEvent({ agentRunId: 'run-123' }));

    // Emit event with matching runId — should come through
    bus.emit('notification', createTestEvent({ agentRunId: 'run-456', message: 'Matched event' }));

    await new Promise((r) => setTimeout(r, 50));
    controller.abort();

    const chunks = await chunksPromise;
    const allData = chunks.join('');

    expect(allData).toContain('run-456');
    expect(allData).toContain('Matched event');
    expect(allData).not.toContain('run-123');
  });

  it('should stream all events when no runId filter is set', async () => {
    const controller = new AbortController();
    const request = new Request('http://localhost:3000/api/agent-events', {
      signal: controller.signal,
    });

    const response = await routeModule.GET(request);
    const body = response.body!;

    const bus = getNotificationBus();

    const chunksPromise = readSSEChunks(body, controller.signal, 5);

    await new Promise((r) => setTimeout(r, 50));

    bus.emit('notification', createTestEvent({ agentRunId: 'run-1', message: 'First event' }));
    bus.emit('notification', createTestEvent({ agentRunId: 'run-2', message: 'Second event' }));

    await new Promise((r) => setTimeout(r, 50));
    controller.abort();

    const chunks = await chunksPromise;
    const allData = chunks.join('');

    expect(allData).toContain('run-1');
    expect(allData).toContain('First event');
    expect(allData).toContain('run-2');
    expect(allData).toContain('Second event');
  });

  it('should clean up listener when request is aborted', async () => {
    const controller = new AbortController();
    const request = new Request('http://localhost:3000/api/agent-events', {
      signal: controller.signal,
    });

    const bus = getNotificationBus();
    const listenersBefore = bus.listenerCount('notification');

    const response = await routeModule.GET(request);
    // Read the stream to trigger the start() callback
    const body = response.body!;
    const reader = body.getReader();

    // Allow the stream to start and register the listener
    await new Promise((r) => setTimeout(r, 50));
    const listenersAfterStart = bus.listenerCount('notification');
    expect(listenersAfterStart).toBe(listenersBefore + 1);

    // Abort the request
    controller.abort();

    // Allow cleanup to run
    await new Promise((r) => setTimeout(r, 50));

    // Try to read to trigger cleanup
    try {
      await reader.read();
    } catch {
      // Expected
    }
    reader.releaseLock();

    // Give cleanup time
    await new Promise((r) => setTimeout(r, 100));

    const listenersAfterAbort = bus.listenerCount('notification');
    expect(listenersAfterAbort).toBe(listenersBefore);
  });

  it('should send heartbeat comments at the configured interval', async () => {
    vi.useFakeTimers();

    const controller = new AbortController();
    const request = new Request('http://localhost:3000/api/agent-events', {
      signal: controller.signal,
    });

    const response = await routeModule.GET(request);
    const body = response.body!;
    const reader = body.getReader();
    const decoder = new TextDecoder();

    // Advance time past the heartbeat interval (30 seconds)
    await vi.advanceTimersByTimeAsync(30_000);

    // Read the heartbeat chunk
    const { value } = await reader.read();
    const chunk = decoder.decode(value, { stream: true });

    expect(chunk).toContain(': heartbeat');

    reader.releaseLock();
    controller.abort();

    vi.useRealTimers();
  });

  it('should support multiple concurrent SSE clients independently', async () => {
    const controller1 = new AbortController();
    const controller2 = new AbortController();

    const request1 = new Request('http://localhost:3000/api/agent-events', {
      signal: controller1.signal,
    });
    const request2 = new Request('http://localhost:3000/api/agent-events', {
      signal: controller2.signal,
    });

    const response1 = await routeModule.GET(request1);
    const response2 = await routeModule.GET(request2);

    const bus = getNotificationBus();

    const chunks1Promise = readSSEChunks(response1.body!, controller1.signal, 2);
    const chunks2Promise = readSSEChunks(response2.body!, controller2.signal, 2);

    await new Promise((r) => setTimeout(r, 50));

    const testEvent = createTestEvent({ message: 'Fan-out event' });
    bus.emit('notification', testEvent);

    await new Promise((r) => setTimeout(r, 50));

    controller1.abort();
    controller2.abort();

    const chunks1 = await chunks1Promise;
    const chunks2 = await chunks2Promise;

    const data1 = chunks1.join('');
    const data2 = chunks2.join('');

    // Both clients should receive the same event
    expect(data1).toContain('Fan-out event');
    expect(data2).toContain('Fan-out event');
  });
});
