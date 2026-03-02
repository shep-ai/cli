import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// --- Fetch mock ---
const mockFetch = vi.fn();

beforeEach(() => {
  vi.stubGlobal('fetch', mockFetch);
});

afterEach(() => {
  vi.restoreAllMocks();
});

import { useDecisionChat, type ChatMessage } from '@/hooks/use-decision-chat';

/** Helper: create a ReadableStream from chunks with an optional delay. */
function makeStreamResponse(chunks: string[], status = 200): Response {
  const encoder = new TextEncoder();
  let index = 0;

  const stream = new ReadableStream<Uint8Array>({
    pull(controller) {
      if (index < chunks.length) {
        controller.enqueue(encoder.encode(`${chunks[index]}\n`));
        index++;
      } else {
        controller.close();
      }
    },
  });

  return new Response(stream, { status, headers: { 'Content-Type': 'text/plain' } });
}

const reviewContext = {
  name: 'Test Feature',
  summary: 'A test feature',
  decisions: [],
  technologies: [],
};

describe('useDecisionChat', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns initial empty state', () => {
    const { result } = renderHook(() => useDecisionChat('tech', 'feat-1'));

    expect(result.current.messages).toEqual([]);
    expect(result.current.isStreaming).toBe(false);
    expect(result.current.error).toBeNull();
    expect(typeof result.current.sendMessage).toBe('function');
    expect(typeof result.current.resetChat).toBe('function');
  });

  it('adds a user message when sendMessage is called', async () => {
    mockFetch.mockResolvedValue(
      makeStreamResponse([
        JSON.stringify({ type: 'result', content: 'Response', timestamp: new Date() }),
      ])
    );

    const { result } = renderHook(() => useDecisionChat('tech', 'feat-1'));

    await act(async () => {
      await result.current.sendMessage('Hello agent', reviewContext);
    });

    const userMessage = result.current.messages.find((m: ChatMessage) => m.role === 'user');
    expect(userMessage).toBeDefined();
    expect(userMessage!.content).toBe('Hello agent');
  });

  it('sets isStreaming to true during fetch and resets after', async () => {
    let resolveStream: (() => void) | undefined;
    const streamPromise = new Promise<void>((r) => {
      resolveStream = r;
    });

    mockFetch.mockImplementation(() => {
      return streamPromise.then(() =>
        makeStreamResponse([
          JSON.stringify({ type: 'result', content: 'Done', timestamp: new Date() }),
        ])
      );
    });

    const { result } = renderHook(() => useDecisionChat('tech', 'feat-1'));

    // Start sending
    let sendPromise: Promise<void>;
    act(() => {
      sendPromise = result.current.sendMessage('Hello', reviewContext);
    });

    // isStreaming should be true while waiting
    expect(result.current.isStreaming).toBe(true);

    // Resolve the stream
    await act(async () => {
      resolveStream!();
      await sendPromise!;
    });

    expect(result.current.isStreaming).toBe(false);
  });

  it('calls fetch with correct body', async () => {
    mockFetch.mockResolvedValue(
      makeStreamResponse([
        JSON.stringify({ type: 'result', content: 'Done', timestamp: new Date() }),
      ])
    );

    const { result } = renderHook(() => useDecisionChat('tech', 'feat-1'));

    await act(async () => {
      await result.current.sendMessage('Why PostgreSQL?', reviewContext);
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toBe('/api/decision-chat');
    expect(options.method).toBe('POST');

    const body = JSON.parse(options.body);
    expect(body.featureId).toBe('feat-1');
    expect(body.reviewType).toBe('tech');
    expect(body.reviewContext).toEqual(reviewContext);
    expect(body.messages).toHaveLength(1);
    expect(body.messages[0]).toEqual({ role: 'user', content: 'Why PostgreSQL?' });
  });

  it('incrementally updates assistant message from streaming chunks', async () => {
    mockFetch.mockResolvedValue(
      makeStreamResponse([
        JSON.stringify({ type: 'progress', content: 'Hello', timestamp: new Date() }),
        JSON.stringify({ type: 'progress', content: ' world', timestamp: new Date() }),
        JSON.stringify({ type: 'result', content: 'Hello world', timestamp: new Date() }),
      ])
    );

    const { result } = renderHook(() => useDecisionChat('tech', 'feat-1'));

    await act(async () => {
      await result.current.sendMessage('Hi', reviewContext);
    });

    const assistantMessages = result.current.messages.filter(
      (m: ChatMessage) => m.role === 'assistant'
    );
    expect(assistantMessages).toHaveLength(1);
    expect(assistantMessages[0].content).toBe('Hello world');
  });

  it('sets error state on fetch failure', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useDecisionChat('tech', 'feat-1'));

    await act(async () => {
      await result.current.sendMessage('Hello', reviewContext);
    });

    expect(result.current.error).toBe('Network error');
    expect(result.current.isStreaming).toBe(false);
  });

  it('sets error state on non-ok response', async () => {
    mockFetch.mockResolvedValue(
      new Response(JSON.stringify({ error: 'Bad request' }), { status: 400 })
    );

    const { result } = renderHook(() => useDecisionChat('tech', 'feat-1'));

    await act(async () => {
      await result.current.sendMessage('Hello', reviewContext);
    });

    expect(result.current.error).toBe('Bad request');
    expect(result.current.isStreaming).toBe(false);
  });

  it('resets messages when featureId changes', async () => {
    mockFetch.mockResolvedValue(
      makeStreamResponse([
        JSON.stringify({ type: 'result', content: 'Response', timestamp: new Date() }),
      ])
    );

    const { result, rerender } = renderHook(({ featureId }) => useDecisionChat('tech', featureId), {
      initialProps: { featureId: 'feat-1' },
    });

    await act(async () => {
      await result.current.sendMessage('Hello', reviewContext);
    });

    expect(result.current.messages.length).toBeGreaterThan(0);

    // Change featureId
    rerender({ featureId: 'feat-2' });

    expect(result.current.messages).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('resetChat clears messages and error', async () => {
    mockFetch.mockResolvedValue(
      makeStreamResponse([
        JSON.stringify({ type: 'result', content: 'Response', timestamp: new Date() }),
      ])
    );

    const { result } = renderHook(() => useDecisionChat('tech', 'feat-1'));

    await act(async () => {
      await result.current.sendMessage('Hello', reviewContext);
    });

    expect(result.current.messages.length).toBeGreaterThan(0);

    act(() => {
      result.current.resetChat();
    });

    expect(result.current.messages).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('sends full conversation history with each request', async () => {
    // First call
    mockFetch.mockResolvedValueOnce(
      makeStreamResponse([
        JSON.stringify({ type: 'result', content: 'First response', timestamp: new Date() }),
      ])
    );

    const { result } = renderHook(() => useDecisionChat('tech', 'feat-1'));

    await act(async () => {
      await result.current.sendMessage('First question', reviewContext);
    });

    // Second call
    mockFetch.mockResolvedValueOnce(
      makeStreamResponse([
        JSON.stringify({ type: 'result', content: 'Second response', timestamp: new Date() }),
      ])
    );

    await act(async () => {
      await result.current.sendMessage('Second question', reviewContext);
    });

    // The second fetch should include the full history
    const [, secondCallOptions] = mockFetch.mock.calls[1];
    const body = JSON.parse(secondCallOptions.body);
    expect(body.messages).toHaveLength(3); // user1, assistant1, user2
    expect(body.messages[0]).toEqual({ role: 'user', content: 'First question' });
    expect(body.messages[1]).toEqual({ role: 'assistant', content: 'First response' });
    expect(body.messages[2]).toEqual({ role: 'user', content: 'Second question' });
  });

  it('handles stream error events', async () => {
    mockFetch.mockResolvedValue(
      makeStreamResponse([
        JSON.stringify({ type: 'progress', content: 'Starting', timestamp: new Date() }),
        JSON.stringify({ type: 'error', content: 'Agent crashed', timestamp: new Date() }),
      ])
    );

    const { result } = renderHook(() => useDecisionChat('tech', 'feat-1'));

    await act(async () => {
      await result.current.sendMessage('Hello', reviewContext);
    });

    expect(result.current.error).toBe('Agent crashed');
    expect(result.current.isStreaming).toBe(false);
  });

  it('aborts in-flight request on unmount', async () => {
    const abortSpy = vi.spyOn(AbortController.prototype, 'abort');

    // Create a fetch that never resolves
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    mockFetch.mockImplementation(() => new Promise(() => {}));

    const { result, unmount } = renderHook(() => useDecisionChat('tech', 'feat-1'));

    act(() => {
      // Fire and forget — this will hang because fetch never resolves
      void result.current.sendMessage('Hello', reviewContext);
    });

    // Unmount should trigger abort
    unmount();

    expect(abortSpy).toHaveBeenCalled();
    abortSpy.mockRestore();
  });

  it('does not send when isStreaming is true', async () => {
    // Create a fetch that never resolves
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    mockFetch.mockImplementation(() => new Promise(() => {}));

    const { result } = renderHook(() => useDecisionChat('tech', 'feat-1'));

    act(() => {
      void result.current.sendMessage('First', reviewContext);
    });

    expect(result.current.isStreaming).toBe(true);

    // Try to send another message while streaming
    await act(async () => {
      await result.current.sendMessage('Second', reviewContext);
    });

    // Only one fetch call should have been made
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});
