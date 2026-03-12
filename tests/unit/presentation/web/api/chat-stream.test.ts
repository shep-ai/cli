// @vitest-environment node

/**
 * API Route Tests: POST /api/chat/stream
 *
 * Tests for the SSE chat streaming endpoint that delegates to
 * IAgentExecutorProvider via the DI container.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// --- Mock DI container ---

const mockGetExecutor = vi.fn();
const mockExecute = vi.fn();
const mockExecuteStream = vi.fn();
const mockSupportsFeature = vi.fn();

vi.mock('@/lib/server-container', () => ({
  resolve: vi.fn((token: string) => {
    if (token === 'IAgentExecutorProvider') {
      return { getExecutor: mockGetExecutor };
    }
    throw new Error(`Unknown token: ${token}`);
  }),
}));

// --- Helpers ---

function makeRequest(body: unknown): Request {
  return new Request('http://localhost:3000/api/chat/stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function makeInvalidJsonRequest(): Request {
  return new Request('http://localhost:3000/api/chat/stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: 'not-json',
  });
}

function makeStreamingExecutor() {
  return {
    agentType: 'claude-code',
    execute: mockExecute,
    executeStream: mockExecuteStream,
    supportsFeature: mockSupportsFeature,
  };
}

async function* makeAsyncIterable<T>(items: T[]): AsyncIterable<T> {
  for (const item of items) {
    yield item;
  }
}

async function readFullResponse(response: Response): Promise<string> {
  return response.text();
}

// --- Tests ---

describe('POST /api/chat/stream', () => {
  // eslint-disable-next-line @typescript-eslint/consistent-type-imports
  let routeModule: typeof import('@/app/api/chat/stream/route');

  beforeEach(async () => {
    vi.clearAllMocks();
    mockSupportsFeature.mockReturnValue(true);
    mockGetExecutor.mockResolvedValue(makeStreamingExecutor());

    routeModule = await import('../../../../../src/presentation/web/app/api/chat/stream/route.js');
  });

  /* ---------------------------------------------------------------- */
  /*  Validation                                                       */
  /* ---------------------------------------------------------------- */

  it('returns 400 for invalid JSON', async () => {
    const response = await routeModule.POST(makeInvalidJsonRequest());

    expect(response.status).toBe(400);
    expect(await response.text()).toBe('Invalid JSON in request body');
  });

  it('returns 400 for missing message field', async () => {
    const response = await routeModule.POST(makeRequest({}));

    expect(response.status).toBe(400);
    expect(await response.text()).toContain('message is required');
  });

  it('returns 400 for empty message', async () => {
    const response = await routeModule.POST(makeRequest({ message: '   ' }));

    expect(response.status).toBe(400);
    expect(await response.text()).toContain('message is required');
  });

  it('returns 400 for message exceeding max length', async () => {
    const response = await routeModule.POST(makeRequest({ message: 'a'.repeat(10_001) }));

    expect(response.status).toBe(400);
    expect(await response.text()).toContain('10000 characters');
  });

  it('returns 400 for non-string message', async () => {
    const response = await routeModule.POST(makeRequest({ message: 123 }));

    expect(response.status).toBe(400);
    expect(await response.text()).toContain('message is required');
  });

  /* ---------------------------------------------------------------- */
  /*  SSE response format                                              */
  /* ---------------------------------------------------------------- */

  it('returns SSE content-type headers', async () => {
    mockExecuteStream.mockReturnValue(makeAsyncIterable([]));

    const response = await routeModule.POST(makeRequest({ message: 'Hello' }));

    expect(response.headers.get('Content-Type')).toBe('text/event-stream');
    expect(response.headers.get('Cache-Control')).toBe('no-cache');
    expect(response.headers.get('Connection')).toBe('keep-alive');
  });

  /* ---------------------------------------------------------------- */
  /*  Streaming execution                                              */
  /* ---------------------------------------------------------------- */

  it('resolves IAgentExecutorProvider and calls executeStream', async () => {
    mockExecuteStream.mockReturnValue(
      makeAsyncIterable([{ type: 'result', content: 'done', timestamp: new Date() }])
    );

    const response = await routeModule.POST(makeRequest({ message: 'Hello', sessionId: 'sess-1' }));
    await readFullResponse(response);

    expect(mockGetExecutor).toHaveBeenCalled();
    expect(mockSupportsFeature).toHaveBeenCalled();
    expect(mockExecuteStream).toHaveBeenCalledWith(
      'Hello',
      expect.objectContaining({
        systemPrompt: expect.any(String),
        resumeSession: 'sess-1',
        silent: true,
      })
    );
  });

  it('forwards progress events as SSE data', async () => {
    mockExecuteStream.mockReturnValue(
      makeAsyncIterable([
        { type: 'progress', content: 'Hello ', timestamp: new Date() },
        { type: 'progress', content: 'world', timestamp: new Date() },
        { type: 'result', content: '', timestamp: new Date() },
      ])
    );

    const response = await routeModule.POST(makeRequest({ message: 'Hi' }));
    const text = await readFullResponse(response);

    expect(text).toContain('data: {"type":"progress","content":"Hello "}');
    expect(text).toContain('data: {"type":"progress","content":"world"}');
    expect(text).toContain('data: {"type":"result"');
  });

  it('forwards result event with sessionId', async () => {
    mockExecuteStream.mockReturnValue(
      makeAsyncIterable([
        { type: 'result', content: 'Done', timestamp: new Date(), sessionId: 'new-sess' },
      ])
    );

    const response = await routeModule.POST(makeRequest({ message: 'Hi' }));
    const text = await readFullResponse(response);

    expect(text).toContain('"type":"result"');
    expect(text).toContain('"sessionId":"new-sess"');
  });

  it('forwards error events from agent executor', async () => {
    mockExecuteStream.mockReturnValue(
      makeAsyncIterable([{ type: 'error', content: 'Model rate limited', timestamp: new Date() }])
    );

    const response = await routeModule.POST(makeRequest({ message: 'Hi' }));
    const text = await readFullResponse(response);

    expect(text).toContain('data: {"type":"error","content":"Model rate limited"}');
  });

  it('handles agent executor throwing an error', async () => {
    // eslint-disable-next-line require-yield
    mockExecuteStream.mockImplementation(function* () {
      throw new Error('DI resolution failed');
    });

    const response = await routeModule.POST(makeRequest({ message: 'Hi' }));
    const text = await readFullResponse(response);

    expect(text).toContain('"type":"error"');
    expect(text).toContain('DI resolution failed');
  });

  /* ---------------------------------------------------------------- */
  /*  Non-streaming fallback                                           */
  /* ---------------------------------------------------------------- */

  it('falls back to execute() for non-streaming agents', async () => {
    mockSupportsFeature.mockReturnValue(false);
    mockExecute.mockResolvedValue({
      result: 'Non-streaming response',
      sessionId: 'fallback-sess',
    });

    const response = await routeModule.POST(makeRequest({ message: 'Hi' }));
    const text = await readFullResponse(response);

    expect(mockExecute).toHaveBeenCalledWith(
      'Hi',
      expect.objectContaining({
        systemPrompt: expect.any(String),
        silent: true,
      })
    );
    expect(text).toContain('"type":"progress","content":"Non-streaming response"');
    expect(text).toContain('"type":"result"');
    expect(text).toContain('"sessionId":"fallback-sess"');
  });

  /* ---------------------------------------------------------------- */
  /*  Session handling                                                 */
  /* ---------------------------------------------------------------- */

  it('passes undefined resumeSession when sessionId is null', async () => {
    mockExecuteStream.mockReturnValue(
      makeAsyncIterable([{ type: 'result', content: '', timestamp: new Date() }])
    );

    const response = await routeModule.POST(makeRequest({ message: 'Hi', sessionId: null }));
    await readFullResponse(response);

    expect(mockExecuteStream).toHaveBeenCalledWith(
      'Hi',
      expect.objectContaining({ resumeSession: undefined })
    );
  });

  it('accepts request without sessionId field', async () => {
    mockExecuteStream.mockReturnValue(
      makeAsyncIterable([{ type: 'result', content: '', timestamp: new Date() }])
    );

    const response = await routeModule.POST(makeRequest({ message: 'Hi' }));
    await readFullResponse(response);

    expect(mockExecuteStream).toHaveBeenCalledWith(
      'Hi',
      expect.objectContaining({ resumeSession: undefined })
    );
  });
});
