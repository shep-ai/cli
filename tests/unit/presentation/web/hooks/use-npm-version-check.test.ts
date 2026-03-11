import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useNpmVersionCheck } from '@/hooks/use-npm-version-check';

describe('useNpmVersionCheck', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('returns updateAvailable=true when latest > current', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ latest: '2.0.0' }),
    });

    const { result } = renderHook(() => useNpmVersionCheck('1.99.0'));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.latest).toBe('2.0.0');
    expect(result.current.updateAvailable).toBe(true);
  });

  it('returns updateAvailable=false when latest === current', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ latest: '1.99.0' }),
    });

    const { result } = renderHook(() => useNpmVersionCheck('1.99.0'));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.latest).toBe('1.99.0');
    expect(result.current.updateAvailable).toBe(false);
  });

  it('returns updateAvailable=false when latest < current', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ latest: '1.0.0' }),
    });

    const { result } = renderHook(() => useNpmVersionCheck('1.99.0'));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.latest).toBe('1.0.0');
    expect(result.current.updateAvailable).toBe(false);
  });

  it('handles fetch failure gracefully', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useNpmVersionCheck('1.99.0'));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.latest).toBeNull();
    expect(result.current.updateAvailable).toBe(false);
  });

  it('handles non-ok response gracefully', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 502,
    });

    const { result } = renderHook(() => useNpmVersionCheck('1.99.0'));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.latest).toBeNull();
    expect(result.current.updateAvailable).toBe(false);
  });

  it('starts in loading state', () => {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    globalThis.fetch = vi.fn().mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useNpmVersionCheck('1.99.0'));

    expect(result.current.loading).toBe(true);
    expect(result.current.latest).toBeNull();
    expect(result.current.updateAvailable).toBe(false);
  });
});
