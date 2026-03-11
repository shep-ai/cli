import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useVersion } from '@/hooks/use-version';

describe('useVersion', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('fetches version data from /api/version', async () => {
    const mockData = {
      version: '1.101.0',
      packageName: '@shepai/cli',
      description: 'Test',
      branch: 'main',
      commitHash: 'abc1234',
      instancePath: '/test',
      isDev: false,
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockData),
    });

    const { result } = renderHook(() => useVersion());

    await waitFor(() => {
      expect(result.current.version).toBe('1.101.0');
    });

    expect(result.current).toEqual(mockData);
    expect(globalThis.fetch).toHaveBeenCalledWith('/api/version');
  });

  it('returns defaults before fetch completes', () => {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    globalThis.fetch = vi.fn().mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useVersion());

    expect(result.current.version).toBe('unknown');
    expect(result.current.packageName).toBe('@shepai/cli');
    expect(result.current.isDev).toBe(false);
  });

  it('handles fetch failure gracefully', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useVersion());

    // Wait for the fetch to settle
    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalled();
    });

    // Should still have defaults
    expect(result.current.version).toBe('unknown');
  });

  it('handles non-ok response gracefully', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
    });

    const { result } = renderHook(() => useVersion());

    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalled();
    });

    expect(result.current.version).toBe('unknown');
  });
});
