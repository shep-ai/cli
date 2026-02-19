import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useRepositoryActions } from '@/components/common/repository-node/use-repository-actions';

const mockInput = { repositoryPath: '/home/user/my-repo' };

function mockFetchSuccess(body: Record<string, unknown> = { success: true }) {
  return vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve(body),
  });
}

function mockFetchError(errorMessage = 'Something went wrong', status = 500) {
  return vi.fn().mockResolvedValue({
    ok: false,
    status,
    json: () => Promise.resolve({ error: errorMessage }),
  });
}

function mockFetchNetworkError() {
  return vi.fn().mockRejectedValue(new Error('Network error'));
}

describe('useRepositoryActions', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('openInIde', () => {
    it('calls fetch with correct URL and body (no branch)', async () => {
      const fetchMock = mockFetchSuccess({ success: true, editor: 'VS Code', path: '/some/path' });
      globalThis.fetch = fetchMock;

      const { result } = renderHook(() => useRepositoryActions(mockInput));

      await act(async () => {
        await result.current.openInIde();
      });

      expect(fetchMock).toHaveBeenCalledWith('/api/ide/open', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repositoryPath: mockInput.repositoryPath,
        }),
      });
    });

    it('sets ideLoading to true during fetch and false after', async () => {
      let resolvePromise!: (value: Response) => void;
      globalThis.fetch = vi.fn(
        () =>
          new Promise<Response>((resolve) => {
            resolvePromise = resolve;
          })
      );

      const { result } = renderHook(() => useRepositoryActions(mockInput));

      expect(result.current.ideLoading).toBe(false);

      let actionPromise: Promise<void>;
      act(() => {
        actionPromise = result.current.openInIde();
      });

      expect(result.current.ideLoading).toBe(true);

      await act(async () => {
        resolvePromise({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        } as Response);
        await actionPromise!;
      });

      expect(result.current.ideLoading).toBe(false);
    });

    it('sets ideError when fetch returns non-ok response', async () => {
      globalThis.fetch = mockFetchError('IDE not installed');

      const { result } = renderHook(() => useRepositoryActions(mockInput));

      await act(async () => {
        await result.current.openInIde();
      });

      expect(result.current.ideError).toBe('IDE not installed');
    });

    it('auto-clears ideError after 5 seconds', async () => {
      globalThis.fetch = mockFetchError('IDE not installed');

      const { result } = renderHook(() => useRepositoryActions(mockInput));

      await act(async () => {
        await result.current.openInIde();
      });

      expect(result.current.ideError).toBe('IDE not installed');

      act(() => {
        vi.advanceTimersByTime(5000);
      });

      expect(result.current.ideError).toBeNull();
    });

    it('is no-op when input is null', async () => {
      const fetchMock = mockFetchSuccess();
      globalThis.fetch = fetchMock;

      const { result } = renderHook(() => useRepositoryActions(null));

      await act(async () => {
        await result.current.openInIde();
      });

      expect(fetchMock).not.toHaveBeenCalled();
      expect(result.current.ideLoading).toBe(false);
    });

    it('is no-op while ideLoading is true', async () => {
      let resolvePromise!: (value: Response) => void;
      const fetchMock = vi.fn(
        () =>
          new Promise<Response>((resolve) => {
            resolvePromise = resolve;
          })
      );
      globalThis.fetch = fetchMock;

      const { result } = renderHook(() => useRepositoryActions(mockInput));

      act(() => {
        result.current.openInIde();
      });

      expect(result.current.ideLoading).toBe(true);
      expect(fetchMock).toHaveBeenCalledTimes(1);

      // Second call should be no-op
      await act(async () => {
        await result.current.openInIde();
      });

      expect(fetchMock).toHaveBeenCalledTimes(1);

      // Cleanup
      await act(async () => {
        resolvePromise({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        } as Response);
      });
    });

    it('catches network error and sets ideError', async () => {
      globalThis.fetch = mockFetchNetworkError();

      const { result } = renderHook(() => useRepositoryActions(mockInput));

      await act(async () => {
        await result.current.openInIde();
      });

      expect(result.current.ideError).toBe('Network error');
      expect(result.current.ideLoading).toBe(false);
    });
  });

  describe('openInShell', () => {
    it('calls fetch with correct URL and body (no branch)', async () => {
      const fetchMock = mockFetchSuccess({ success: true, path: '/some/path', shell: 'zsh' });
      globalThis.fetch = fetchMock;

      const { result } = renderHook(() => useRepositoryActions(mockInput));

      await act(async () => {
        await result.current.openInShell();
      });

      expect(fetchMock).toHaveBeenCalledWith('/api/shell/open', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repositoryPath: mockInput.repositoryPath,
        }),
      });
    });

    it('sets shellLoading to true during fetch and false after', async () => {
      let resolvePromise!: (value: Response) => void;
      globalThis.fetch = vi.fn(
        () =>
          new Promise<Response>((resolve) => {
            resolvePromise = resolve;
          })
      );

      const { result } = renderHook(() => useRepositoryActions(mockInput));

      expect(result.current.shellLoading).toBe(false);

      let actionPromise: Promise<void>;
      act(() => {
        actionPromise = result.current.openInShell();
      });

      expect(result.current.shellLoading).toBe(true);

      await act(async () => {
        resolvePromise({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        } as Response);
        await actionPromise!;
      });

      expect(result.current.shellLoading).toBe(false);
    });

    it('sets shellError when fetch returns non-ok response', async () => {
      globalThis.fetch = mockFetchError('Shell not available');

      const { result } = renderHook(() => useRepositoryActions(mockInput));

      await act(async () => {
        await result.current.openInShell();
      });

      expect(result.current.shellError).toBe('Shell not available');
    });

    it('auto-clears shellError after 5 seconds', async () => {
      globalThis.fetch = mockFetchError('Shell not available');

      const { result } = renderHook(() => useRepositoryActions(mockInput));

      await act(async () => {
        await result.current.openInShell();
      });

      expect(result.current.shellError).toBe('Shell not available');

      act(() => {
        vi.advanceTimersByTime(5000);
      });

      expect(result.current.shellError).toBeNull();
    });

    it('is no-op when input is null', async () => {
      const fetchMock = mockFetchSuccess();
      globalThis.fetch = fetchMock;

      const { result } = renderHook(() => useRepositoryActions(null));

      await act(async () => {
        await result.current.openInShell();
      });

      expect(fetchMock).not.toHaveBeenCalled();
      expect(result.current.shellLoading).toBe(false);
    });

    it('is no-op while shellLoading is true', async () => {
      let resolvePromise!: (value: Response) => void;
      const fetchMock = vi.fn(
        () =>
          new Promise<Response>((resolve) => {
            resolvePromise = resolve;
          })
      );
      globalThis.fetch = fetchMock;

      const { result } = renderHook(() => useRepositoryActions(mockInput));

      act(() => {
        result.current.openInShell();
      });

      expect(result.current.shellLoading).toBe(true);
      expect(fetchMock).toHaveBeenCalledTimes(1);

      // Second call should be no-op
      await act(async () => {
        await result.current.openInShell();
      });

      expect(fetchMock).toHaveBeenCalledTimes(1);

      // Cleanup
      await act(async () => {
        resolvePromise({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        } as Response);
      });
    });

    it('catches network error and sets shellError', async () => {
      globalThis.fetch = mockFetchNetworkError();

      const { result } = renderHook(() => useRepositoryActions(mockInput));

      await act(async () => {
        await result.current.openInShell();
      });

      expect(result.current.shellError).toBe('Network error');
      expect(result.current.shellLoading).toBe(false);
    });
  });

  describe('timer cleanup', () => {
    it('cleans up auto-clear timers on unmount', async () => {
      globalThis.fetch = mockFetchError('IDE not installed');

      const { result, unmount } = renderHook(() => useRepositoryActions(mockInput));

      await act(async () => {
        await result.current.openInIde();
      });

      expect(result.current.ideError).toBe('IDE not installed');

      unmount();

      // Advancing timers after unmount should not throw
      act(() => {
        vi.advanceTimersByTime(5000);
      });
    });
  });
});
