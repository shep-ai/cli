// @vitest-environment node

/**
 * SSE API Route Tests: GET /api/deployment-logs
 *
 * Tests for the deployment logs SSE endpoint that streams log events
 * from the DeploymentService EventEmitter.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { LogEntry } from '@shepai/core/application/ports/output/services/deployment-service.interface';

// --- Mock DI container ---

type LogHandler = (entry: LogEntry) => void;
const logHandlers: LogHandler[] = [];

const mockGetLogs = vi.fn();
const mockOn = vi.fn((event: string, handler: LogHandler) => {
  if (event === 'log') logHandlers.push(handler);
});
const mockOff = vi.fn((event: string, handler: LogHandler) => {
  if (event === 'log') {
    const idx = logHandlers.indexOf(handler);
    if (idx >= 0) logHandlers.splice(idx, 1);
  }
});

vi.mock('@/lib/server-container', () => ({
  resolve: vi.fn(() => ({
    getLogs: mockGetLogs,
    on: mockOn,
    off: mockOff,
  })),
}));

// --- Helpers ---

function makeLogEntry(overrides?: Partial<LogEntry>): LogEntry {
  return {
    targetId: 'feat-1',
    stream: 'stdout',
    line: 'hello world',
    timestamp: Date.now(),
    ...overrides,
  };
}

function emitLog(entry: LogEntry) {
  for (const handler of [...logHandlers]) {
    handler(entry);
  }
}

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

describe('SSE API Route: GET /api/deployment-logs', () => {
  // eslint-disable-next-line @typescript-eslint/consistent-type-imports
  let routeModule: typeof import('@/presentation/web/app/api/deployment-logs/route.js');

  beforeEach(async () => {
    vi.useFakeTimers();
    logHandlers.length = 0;
    vi.clearAllMocks();

    routeModule = await import(
      '../../../../../src/presentation/web/app/api/deployment-logs/route.js'
    );
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('should return response with text/event-stream content type', () => {
    const controller = new AbortController();
    const request = new Request('http://localhost:3000/api/deployment-logs?targetId=feat-1', {
      signal: controller.signal,
    });

    const response = routeModule.GET(request);

    expect(response.headers.get('Content-Type')).toBe('text/event-stream');
    expect(response.headers.get('Cache-Control')).toBe('no-cache');
    expect(response.headers.get('Connection')).toBe('keep-alive');

    controller.abort();
  });

  it('should return error event when targetId is missing', async () => {
    const controller = new AbortController();
    const request = new Request('http://localhost:3000/api/deployment-logs', {
      signal: controller.signal,
    });

    const response = routeModule.GET(request);
    const chunks = await readSSEChunks(response.body!, controller.signal, 5);
    const allData = chunks.join('');

    expect(allData).toContain('event: error');
    expect(allData).toContain('targetId is required');

    controller.abort();
  });

  it('should return error event when targetId is empty string', async () => {
    const controller = new AbortController();
    const request = new Request('http://localhost:3000/api/deployment-logs?targetId=', {
      signal: controller.signal,
    });

    const response = routeModule.GET(request);
    const chunks = await readSSEChunks(response.body!, controller.signal, 5);
    const allData = chunks.join('');

    expect(allData).toContain('event: error');
    expect(allData).toContain('targetId is required');

    controller.abort();
  });

  it('should subscribe to service.on("log") on connection', () => {
    const controller = new AbortController();
    const request = new Request('http://localhost:3000/api/deployment-logs?targetId=feat-1', {
      signal: controller.signal,
    });

    routeModule.GET(request);

    expect(mockOn).toHaveBeenCalledWith('log', expect.any(Function));

    controller.abort();
  });

  it('should unsubscribe service.off("log") on abort', async () => {
    const controller = new AbortController();
    const request = new Request('http://localhost:3000/api/deployment-logs?targetId=feat-1', {
      signal: controller.signal,
    });

    routeModule.GET(request);

    // Let the stream start
    await vi.advanceTimersByTimeAsync(100);

    controller.abort();

    expect(mockOff).toHaveBeenCalledWith('log', expect.any(Function));
  });

  it('should emit SSE-formatted data for log events matching targetId', async () => {
    const controller = new AbortController();
    const request = new Request('http://localhost:3000/api/deployment-logs?targetId=feat-1', {
      signal: controller.signal,
    });

    const response = routeModule.GET(request);
    const chunksPromise = readSSEChunks(response.body!, controller.signal, 5);

    // Emit a log event
    const entry = makeLogEntry({ targetId: 'feat-1', line: 'server started' });
    emitLog(entry);

    await vi.advanceTimersByTimeAsync(100);

    controller.abort();
    const chunks = await chunksPromise;
    const allData = chunks.join('');

    expect(allData).toContain('event: log');
    expect(allData).toContain('server started');
  });

  it('should not emit events for logs from a different targetId', async () => {
    const controller = new AbortController();
    const request = new Request('http://localhost:3000/api/deployment-logs?targetId=feat-1', {
      signal: controller.signal,
    });

    const response = routeModule.GET(request);
    const chunksPromise = readSSEChunks(response.body!, controller.signal, 5);

    // Emit a log event for a different target
    emitLog(makeLogEntry({ targetId: 'feat-2', line: 'wrong target' }));

    // Emit a log event for the correct target
    emitLog(makeLogEntry({ targetId: 'feat-1', line: 'correct target' }));

    await vi.advanceTimersByTimeAsync(100);

    controller.abort();
    const chunks = await chunksPromise;
    const allData = chunks.join('');

    expect(allData).not.toContain('wrong target');
    expect(allData).toContain('correct target');
  });

  it('should send heartbeat at 30s interval', async () => {
    const controller = new AbortController();
    const request = new Request('http://localhost:3000/api/deployment-logs?targetId=feat-1', {
      signal: controller.signal,
    });

    const response = routeModule.GET(request);
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();

    // Advance time past the heartbeat interval (30 seconds)
    await vi.advanceTimersByTimeAsync(30_000);

    const { value } = await reader.read();
    const chunk = decoder.decode(value, { stream: true });

    expect(chunk).toContain(': heartbeat');

    reader.releaseLock();
    controller.abort();
  });

  it('should clean up intervals and subscriptions when request is aborted', async () => {
    const controller = new AbortController();
    const request = new Request('http://localhost:3000/api/deployment-logs?targetId=feat-1', {
      signal: controller.signal,
    });

    routeModule.GET(request);

    // Verify subscription was created
    expect(logHandlers).toHaveLength(1);

    await vi.advanceTimersByTimeAsync(100);

    controller.abort();

    // Verify subscription was cleaned up
    expect(logHandlers).toHaveLength(0);
    expect(mockOff).toHaveBeenCalledWith('log', expect.any(Function));
  });

  it('should export dynamic as force-dynamic', () => {
    expect(routeModule.dynamic).toBe('force-dynamic');
  });
});
