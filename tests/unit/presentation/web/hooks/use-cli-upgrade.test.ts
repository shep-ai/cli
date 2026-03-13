import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useCliUpgrade } from '@/hooks/use-cli-upgrade';

describe('useCliUpgrade', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('starts in idle state', () => {
    globalThis.fetch = vi.fn();
    const { result } = renderHook(() => useCliUpgrade());

    expect(result.current.status).toBe('idle');
    expect(result.current.output).toBe('');
    expect(result.current.errorMessage).toBeUndefined();
  });

  it('transitions to upgrading state when startUpgrade is called', async () => {
    // Never-resolving fetch to keep it in upgrading state
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    globalThis.fetch = vi.fn().mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useCliUpgrade());

    act(() => {
      result.current.startUpgrade();
    });

    expect(result.current.status).toBe('upgrading');
  });

  it('transitions to upgraded state on successful upgrade', async () => {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode('data: Installing...\n\n'));
        controller.enqueue(
          encoder.encode(
            `event: done\ndata: ${JSON.stringify({ status: 'upgraded', currentVersion: '1.0.0', latestVersion: '2.0.0' })}\n\n`
          )
        );
        controller.close();
      },
    });

    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(stream, {
        status: 200,
        headers: { 'Content-Type': 'text/event-stream' },
      })
    );

    const { result } = renderHook(() => useCliUpgrade());

    act(() => {
      result.current.startUpgrade();
    });

    await waitFor(() => expect(result.current.status).toBe('upgraded'));
  });

  it('transitions to up-to-date state when already current', async () => {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(
          encoder.encode(
            `event: done\ndata: ${JSON.stringify({ status: 'up-to-date', currentVersion: '2.0.0', latestVersion: '2.0.0' })}\n\n`
          )
        );
        controller.close();
      },
    });

    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(stream, {
        status: 200,
        headers: { 'Content-Type': 'text/event-stream' },
      })
    );

    const { result } = renderHook(() => useCliUpgrade());

    act(() => {
      result.current.startUpgrade();
    });

    await waitFor(() => expect(result.current.status).toBe('up-to-date'));
  });

  it('transitions to error state on server error', async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValue(new Response('Internal Server Error', { status: 500 }));

    const { result } = renderHook(() => useCliUpgrade());

    act(() => {
      result.current.startUpgrade();
    });

    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.errorMessage).toContain('500');
  });

  it('transitions to error state on network error', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useCliUpgrade());

    act(() => {
      result.current.startUpgrade();
    });

    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.errorMessage).toBe('Network error');
  });

  it('calls POST /api/cli-upgrade', async () => {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    globalThis.fetch = vi.fn().mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useCliUpgrade());

    act(() => {
      result.current.startUpgrade();
    });

    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/api/cli-upgrade',
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('transitions to restarting state on restarting event', async () => {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(
          encoder.encode(
            `event: done\ndata: ${JSON.stringify({ status: 'upgraded', currentVersion: '1.0.0', latestVersion: '2.0.0' })}\n\n`
          )
        );
        controller.enqueue(encoder.encode(`event: restarting\ndata: restarting\n\n`));
        controller.close();
      },
    });

    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      if (url === '/api/cli-upgrade') {
        return Promise.resolve(
          new Response(stream, {
            status: 200,
            headers: { 'Content-Type': 'text/event-stream' },
          })
        );
      }
      // Poll requests to /api/version should keep returning errors to stay in restarting state
      return Promise.reject(new Error('Server down'));
    });

    const { result } = renderHook(() => useCliUpgrade());

    act(() => {
      result.current.startUpgrade();
    });

    await waitFor(() => expect(result.current.status).toBe('restarting'));
  });

  it('does not set error when connection drops during restart', async () => {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(`event: restarting\ndata: restarting\n\n`));
        // Simulate server killing the connection
        controller.close();
      },
    });

    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      if (url === '/api/cli-upgrade') {
        return Promise.resolve(
          new Response(stream, {
            status: 200,
            headers: { 'Content-Type': 'text/event-stream' },
          })
        );
      }
      return Promise.reject(new Error('Server down'));
    });

    const { result } = renderHook(() => useCliUpgrade());

    act(() => {
      result.current.startUpgrade();
    });

    await waitFor(() => expect(result.current.status).toBe('restarting'));
    // Status should remain 'restarting', not 'error'
    expect(result.current.status).toBe('restarting');
    expect(result.current.errorMessage).toBeUndefined();
  });

  it('prevents starting a new upgrade while restarting', async () => {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(`event: restarting\ndata: restarting\n\n`));
        controller.close();
      },
    });

    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      if (url === '/api/cli-upgrade') {
        return Promise.resolve(
          new Response(stream, {
            status: 200,
            headers: { 'Content-Type': 'text/event-stream' },
          })
        );
      }
      return Promise.reject(new Error('Server down'));
    });

    const { result } = renderHook(() => useCliUpgrade());

    act(() => {
      result.current.startUpgrade();
    });

    await waitFor(() => expect(result.current.status).toBe('restarting'));

    // Attempt to start another upgrade should be no-op
    act(() => {
      result.current.startUpgrade();
    });

    // Should still only have the original upgrade call + poll calls
    const upgradeCalls = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls.filter(
      (call: unknown[]) => call[0] === '/api/cli-upgrade'
    );
    expect(upgradeCalls).toHaveLength(1);
  });
});
