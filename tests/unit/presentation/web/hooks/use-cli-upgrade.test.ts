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
});
