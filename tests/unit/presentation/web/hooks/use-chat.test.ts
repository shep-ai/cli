import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  chatReducer,
  initialChatState,
  parseSSEStream,
  type ChatState,
  type ChatMessage,
} from '@/hooks/use-chat';

/* ------------------------------------------------------------------ */
/*  chatReducer — pure state transition tests                          */
/* ------------------------------------------------------------------ */

describe('chatReducer', () => {
  const makeUserMessage = (overrides?: Partial<ChatMessage>): ChatMessage => ({
    id: 'msg-1',
    role: 'user',
    content: 'Hello',
    timestamp: new Date('2026-01-01T00:00:00Z'),
    status: 'complete',
    ...overrides,
  });

  const makeAssistantMessage = (overrides?: Partial<ChatMessage>): ChatMessage => ({
    id: 'msg-2',
    role: 'assistant',
    content: '',
    timestamp: new Date('2026-01-01T00:00:01Z'),
    status: 'streaming',
    ...overrides,
  });

  it('has correct initial state', () => {
    expect(initialChatState).toEqual({
      messages: [],
      status: 'idle',
      error: null,
      sessionId: null,
    });
  });

  describe('add_user_message', () => {
    it('appends user message and sets status to sending', () => {
      const msg = makeUserMessage();
      const next = chatReducer(initialChatState, { type: 'add_user_message', message: msg });

      expect(next.messages).toHaveLength(1);
      expect(next.messages[0]).toBe(msg);
      expect(next.status).toBe('sending');
      expect(next.error).toBeNull();
    });

    it('clears previous error when adding a message', () => {
      const state: ChatState = { ...initialChatState, error: 'prev error', status: 'error' };
      const msg = makeUserMessage();
      const next = chatReducer(state, { type: 'add_user_message', message: msg });

      expect(next.error).toBeNull();
      expect(next.status).toBe('sending');
    });
  });

  describe('start_streaming', () => {
    it('adds empty assistant message and sets status to streaming', () => {
      const state: ChatState = {
        ...initialChatState,
        messages: [makeUserMessage()],
        status: 'sending',
      };
      const next = chatReducer(state, { type: 'start_streaming' });

      expect(next.messages).toHaveLength(2);
      expect(next.messages[1].role).toBe('assistant');
      expect(next.messages[1].content).toBe('');
      expect(next.messages[1].status).toBe('streaming');
      expect(next.status).toBe('streaming');
    });
  });

  describe('stream_token', () => {
    it('appends content to the last assistant message', () => {
      const state: ChatState = {
        ...initialChatState,
        messages: [makeUserMessage(), makeAssistantMessage()],
        status: 'streaming',
      };

      let next = chatReducer(state, { type: 'stream_token', content: 'Hello' });
      expect(next.messages[1].content).toBe('Hello');

      next = chatReducer(next, { type: 'stream_token', content: ' world' });
      expect(next.messages[1].content).toBe('Hello world');
    });

    it('does not crash when no messages exist', () => {
      const next = chatReducer(initialChatState, { type: 'stream_token', content: 'x' });
      expect(next.messages).toHaveLength(0);
    });
  });

  describe('complete_streaming', () => {
    it('sets assistant message status to complete and status to idle', () => {
      const state: ChatState = {
        ...initialChatState,
        messages: [makeUserMessage(), makeAssistantMessage({ content: 'Hi there' })],
        status: 'streaming',
      };
      const next = chatReducer(state, { type: 'complete_streaming', sessionId: 'sess-1' });

      expect(next.messages[1].status).toBe('complete');
      expect(next.status).toBe('idle');
      expect(next.sessionId).toBe('sess-1');
    });

    it('preserves existing sessionId when none provided', () => {
      const state: ChatState = {
        ...initialChatState,
        messages: [makeUserMessage(), makeAssistantMessage()],
        status: 'streaming',
        sessionId: 'existing-sess',
      };
      const next = chatReducer(state, { type: 'complete_streaming' });

      expect(next.sessionId).toBe('existing-sess');
    });
  });

  describe('set_error', () => {
    it('sets error state and updates assistant message status to error', () => {
      const state: ChatState = {
        ...initialChatState,
        messages: [makeUserMessage(), makeAssistantMessage()],
        status: 'streaming',
      };
      const next = chatReducer(state, { type: 'set_error', error: 'Agent failed' });

      expect(next.error).toBe('Agent failed');
      expect(next.status).toBe('error');
      expect(next.messages[1].status).toBe('error');
    });

    it('sets error even without assistant message', () => {
      const state: ChatState = {
        ...initialChatState,
        messages: [makeUserMessage()],
        status: 'sending',
      };
      const next = chatReducer(state, { type: 'set_error', error: 'Network error' });

      expect(next.error).toBe('Network error');
      expect(next.status).toBe('error');
    });
  });

  describe('clear_messages', () => {
    it('resets all state to initial', () => {
      const state: ChatState = {
        messages: [makeUserMessage(), makeAssistantMessage({ status: 'complete' })],
        status: 'idle',
        error: null,
        sessionId: 'sess-1',
      };
      const next = chatReducer(state, { type: 'clear_messages' });

      expect(next).toEqual(initialChatState);
    });
  });
});

/* ------------------------------------------------------------------ */
/*  parseSSEStream — SSE parser tests                                  */
/* ------------------------------------------------------------------ */

describe('parseSSEStream', () => {
  function makeStream(chunks: string[]): ReadableStreamDefaultReader<Uint8Array> {
    const encoder = new TextEncoder();
    let index = 0;
    return {
      read: async () => {
        if (index >= chunks.length) return { done: true, value: undefined };
        return { done: false, value: encoder.encode(chunks[index++]) };
      },
      releaseLock: vi.fn(),
      cancel: vi.fn(),
      closed: Promise.resolve(undefined),
    } as unknown as ReadableStreamDefaultReader<Uint8Array>;
  }

  it('parses a single SSE event', async () => {
    const reader = makeStream(['data: {"type":"progress","content":"Hello"}\n\n']);

    const events: unknown[] = [];
    for await (const event of parseSSEStream(reader)) {
      events.push(event);
    }

    expect(events).toEqual([{ type: 'progress', content: 'Hello' }]);
  });

  it('parses multiple events in one chunk', async () => {
    const reader = makeStream([
      'data: {"type":"progress","content":"Hi"}\n\n' +
        'data: {"type":"result","content":"Done","sessionId":"s1"}\n\n',
    ]);

    const events: unknown[] = [];
    for await (const event of parseSSEStream(reader)) {
      events.push(event);
    }

    expect(events).toHaveLength(2);
    expect(events[0]).toEqual({ type: 'progress', content: 'Hi' });
    expect(events[1]).toEqual({ type: 'result', content: 'Done', sessionId: 's1' });
  });

  it('handles events split across chunks', async () => {
    const reader = makeStream(['data: {"type":"pro', 'gress","content":"split"}\n\n']);

    const events: unknown[] = [];
    for await (const event of parseSSEStream(reader)) {
      events.push(event);
    }

    expect(events).toEqual([{ type: 'progress', content: 'split' }]);
  });

  it('skips heartbeat comments', async () => {
    const reader = makeStream([
      ': heartbeat\n\n' + 'data: {"type":"progress","content":"real"}\n\n',
    ]);

    const events: unknown[] = [];
    for await (const event of parseSSEStream(reader)) {
      events.push(event);
    }

    expect(events).toEqual([{ type: 'progress', content: 'real' }]);
  });

  it('skips non-JSON data lines', async () => {
    const reader = makeStream([
      'data: not-json\n\n' + 'data: {"type":"progress","content":"valid"}\n\n',
    ]);

    const events: unknown[] = [];
    for await (const event of parseSSEStream(reader)) {
      events.push(event);
    }

    expect(events).toEqual([{ type: 'progress', content: 'valid' }]);
  });
});

/* ------------------------------------------------------------------ */
/*  useChat hook — integration tests with mock fetch                   */
/* ------------------------------------------------------------------ */

describe('useChat', () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock crypto.randomUUID for deterministic IDs
    let counter = 0;
    vi.stubGlobal('crypto', {
      randomUUID: () => `uuid-${++counter}`,
    });

    mockFetch = vi.fn();
    vi.stubGlobal('fetch', mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // Helper to create a mock fetch response with SSE stream
  function makeSSEResponse(events: string[]): Response {
    const encoder = new TextEncoder();
    let index = 0;
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) {
        if (index < events.length) {
          controller.enqueue(encoder.encode(events[index++]));
        } else {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      status: 200,
      headers: { 'Content-Type': 'text/event-stream' },
    });
  }

  // Helper to dynamically import the hook (after mocks are set)
  async function importHook() {
    // Use dynamic import so mocks are in place
    const mod = await import('@/hooks/use-chat');
    return mod.useChat;
  }

  it('starts with empty messages and idle status', async () => {
    const useChat = await importHook();
    const { result } = renderHook(() => useChat());

    expect(result.current.messages).toEqual([]);
    expect(result.current.status).toBe('idle');
    expect(result.current.error).toBeNull();
  });

  it('sendMessage adds user message, calls fetch, and streams tokens', async () => {
    mockFetch.mockResolvedValue(
      makeSSEResponse([
        'data: {"type":"progress","content":"Hello "}\n\n',
        'data: {"type":"progress","content":"world"}\n\n',
        'data: {"type":"result","content":"","sessionId":"sess-abc"}\n\n',
      ])
    );

    const useChat = await importHook();
    const { result } = renderHook(() => useChat());

    await act(async () => {
      await result.current.sendMessage('Hi there');
    });

    // User message was added
    expect(result.current.messages[0].role).toBe('user');
    expect(result.current.messages[0].content).toBe('Hi there');

    // Assistant message was streamed
    expect(result.current.messages[1].role).toBe('assistant');
    expect(result.current.messages[1].content).toBe('Hello world');
    expect(result.current.messages[1].status).toBe('complete');

    // Status returned to idle
    expect(result.current.status).toBe('idle');

    // Fetch was called correctly
    expect(mockFetch).toHaveBeenCalledWith('/api/chat/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Hi there', sessionId: null }),
      signal: expect.any(AbortSignal),
    });
  });

  it('handles SSE error event by setting error state', async () => {
    mockFetch.mockResolvedValue(
      makeSSEResponse(['data: {"type":"error","content":"Agent failed to respond"}\n\n'])
    );

    const useChat = await importHook();
    const { result } = renderHook(() => useChat());

    await act(async () => {
      await result.current.sendMessage('Test');
    });

    expect(result.current.status).toBe('error');
    expect(result.current.error).toBe('Agent failed to respond');
  });

  it('handles network error gracefully', async () => {
    mockFetch.mockRejectedValue(new TypeError('Failed to fetch'));

    const useChat = await importHook();
    const { result } = renderHook(() => useChat());

    await act(async () => {
      await result.current.sendMessage('Test');
    });

    expect(result.current.status).toBe('error');
    expect(result.current.error).toBe('Failed to fetch');
  });

  it('handles non-ok response status', async () => {
    mockFetch.mockResolvedValue(new Response('Bad Request: message is required', { status: 400 }));

    const useChat = await importHook();
    const { result } = renderHook(() => useChat());

    await act(async () => {
      await result.current.sendMessage('Test');
    });

    expect(result.current.status).toBe('error');
    expect(result.current.error).toBe('Bad Request: message is required');
  });

  it('clearChat resets all state', async () => {
    mockFetch.mockResolvedValue(
      makeSSEResponse(['data: {"type":"result","content":"","sessionId":"sess-1"}\n\n'])
    );

    const useChat = await importHook();
    const { result } = renderHook(() => useChat());

    await act(async () => {
      await result.current.sendMessage('Hi');
    });

    expect(result.current.messages.length).toBeGreaterThan(0);

    act(() => {
      result.current.clearChat();
    });

    expect(result.current.messages).toEqual([]);
    expect(result.current.status).toBe('idle');
    expect(result.current.error).toBeNull();
  });

  it('ignores empty or whitespace-only messages', async () => {
    const useChat = await importHook();
    const { result } = renderHook(() => useChat());

    await act(async () => {
      await result.current.sendMessage('   ');
    });

    expect(result.current.messages).toEqual([]);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('passes sessionId from previous response in subsequent requests', async () => {
    // First message
    mockFetch.mockResolvedValueOnce(
      makeSSEResponse(['data: {"type":"result","content":"","sessionId":"sess-first"}\n\n'])
    );

    const useChat = await importHook();
    const { result } = renderHook(() => useChat());

    await act(async () => {
      await result.current.sendMessage('First');
    });

    // Second message — should include sessionId
    mockFetch.mockResolvedValueOnce(
      makeSSEResponse(['data: {"type":"result","content":"","sessionId":"sess-second"}\n\n'])
    );

    await act(async () => {
      await result.current.sendMessage('Second');
    });

    const secondCall = mockFetch.mock.calls[1];
    const body = JSON.parse(secondCall[1].body);
    expect(body.sessionId).toBe('sess-first');
  });

  it('retry resends the last user message', async () => {
    // First attempt — error
    mockFetch.mockResolvedValueOnce(
      makeSSEResponse(['data: {"type":"error","content":"Agent crashed"}\n\n'])
    );

    const useChat = await importHook();
    const { result } = renderHook(() => useChat());

    await act(async () => {
      await result.current.sendMessage('Retry me');
    });

    expect(result.current.status).toBe('error');

    // Retry — success
    mockFetch.mockResolvedValueOnce(
      makeSSEResponse([
        'data: {"type":"progress","content":"Fixed"}\n\n',
        'data: {"type":"result","content":"","sessionId":"sess-retry"}\n\n',
      ])
    );

    await act(async () => {
      await result.current.retry();
    });

    // Should have re-sent with the same message
    const retryCall = mockFetch.mock.calls[1];
    const body = JSON.parse(retryCall[1].body);
    expect(body.message).toBe('Retry me');

    expect(result.current.status).toBe('idle');
  });
});
