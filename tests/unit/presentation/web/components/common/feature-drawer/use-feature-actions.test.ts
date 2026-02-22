import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFeatureActions } from '@/components/common/feature-drawer/use-feature-actions';

const mockInput = { repositoryPath: '/home/user/my-repo', branch: 'feat/auth-module' };

// --- Server action mocks ---
const mockOpenIde = vi.fn();
const mockOpenShell = vi.fn();

vi.mock('@/app/actions/open-ide', () => ({
  openIde: (...args: unknown[]) => mockOpenIde(...args),
}));

vi.mock('@/app/actions/open-shell', () => ({
  openShell: (...args: unknown[]) => mockOpenShell(...args),
}));

describe('useFeatureActions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('openInIde', () => {
    it('calls openIde server action with correct input', async () => {
      mockOpenIde.mockResolvedValue({ success: true, editor: 'VS Code', path: '/some/path' });

      const { result } = renderHook(() => useFeatureActions(mockInput));

      await act(async () => {
        await result.current.openInIde();
      });

      expect(mockOpenIde).toHaveBeenCalledWith({
        repositoryPath: mockInput.repositoryPath,
        branch: mockInput.branch,
      });
    });

    it('sets ideLoading to true during action and false after', async () => {
      let resolvePromise!: (value: { success: boolean }) => void;
      mockOpenIde.mockReturnValue(
        new Promise((resolve) => {
          resolvePromise = resolve;
        })
      );

      const { result } = renderHook(() => useFeatureActions(mockInput));

      expect(result.current.ideLoading).toBe(false);

      let actionPromise: Promise<void>;
      act(() => {
        actionPromise = result.current.openInIde();
      });

      expect(result.current.ideLoading).toBe(true);

      await act(async () => {
        resolvePromise({ success: true });
        await actionPromise!;
      });

      expect(result.current.ideLoading).toBe(false);
    });

    it('sets ideError when server action returns error', async () => {
      mockOpenIde.mockResolvedValue({ success: false, error: 'IDE not installed' });

      const { result } = renderHook(() => useFeatureActions(mockInput));

      await act(async () => {
        await result.current.openInIde();
      });

      expect(result.current.ideError).toBe('IDE not installed');
    });

    it('auto-clears ideError after 5 seconds', async () => {
      mockOpenIde.mockResolvedValue({ success: false, error: 'IDE not installed' });

      const { result } = renderHook(() => useFeatureActions(mockInput));

      await act(async () => {
        await result.current.openInIde();
      });

      expect(result.current.ideError).toBe('IDE not installed');

      act(() => {
        vi.advanceTimersByTime(5000);
      });

      expect(result.current.ideError).toBeNull();
    });

    it('clears ideError on next successful openInIde call', async () => {
      mockOpenIde.mockResolvedValue({ success: false, error: 'IDE not installed' });

      const { result } = renderHook(() => useFeatureActions(mockInput));

      await act(async () => {
        await result.current.openInIde();
      });

      expect(result.current.ideError).toBe('IDE not installed');

      mockOpenIde.mockResolvedValue({ success: true });

      await act(async () => {
        await result.current.openInIde();
      });

      expect(result.current.ideError).toBeNull();
    });

    it('is no-op when input is null', async () => {
      mockOpenIde.mockResolvedValue({ success: true });

      const { result } = renderHook(() => useFeatureActions(null));

      await act(async () => {
        await result.current.openInIde();
      });

      expect(mockOpenIde).not.toHaveBeenCalled();
      expect(result.current.ideLoading).toBe(false);
    });

    it('is no-op while ideLoading is true', async () => {
      let resolvePromise!: (value: { success: boolean }) => void;
      mockOpenIde.mockReturnValue(
        new Promise((resolve) => {
          resolvePromise = resolve;
        })
      );

      const { result } = renderHook(() => useFeatureActions(mockInput));

      act(() => {
        result.current.openInIde();
      });

      expect(result.current.ideLoading).toBe(true);
      expect(mockOpenIde).toHaveBeenCalledTimes(1);

      // Second call should be no-op
      await act(async () => {
        await result.current.openInIde();
      });

      expect(mockOpenIde).toHaveBeenCalledTimes(1);

      // Cleanup
      await act(async () => {
        resolvePromise({ success: true });
      });
    });

    it('catches network error and sets ideError', async () => {
      mockOpenIde.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useFeatureActions(mockInput));

      await act(async () => {
        await result.current.openInIde();
      });

      expect(result.current.ideError).toBe('Network error');
      expect(result.current.ideLoading).toBe(false);
    });
  });

  describe('openInShell', () => {
    it('calls openShell server action with correct input', async () => {
      mockOpenShell.mockResolvedValue({ success: true, path: '/some/path', shell: 'zsh' });

      const { result } = renderHook(() => useFeatureActions(mockInput));

      await act(async () => {
        await result.current.openInShell();
      });

      expect(mockOpenShell).toHaveBeenCalledWith({
        repositoryPath: mockInput.repositoryPath,
        branch: mockInput.branch,
      });
    });

    it('sets shellLoading to true during action and false after', async () => {
      let resolvePromise!: (value: { success: boolean }) => void;
      mockOpenShell.mockReturnValue(
        new Promise((resolve) => {
          resolvePromise = resolve;
        })
      );

      const { result } = renderHook(() => useFeatureActions(mockInput));

      expect(result.current.shellLoading).toBe(false);

      let actionPromise: Promise<void>;
      act(() => {
        actionPromise = result.current.openInShell();
      });

      expect(result.current.shellLoading).toBe(true);

      await act(async () => {
        resolvePromise({ success: true });
        await actionPromise!;
      });

      expect(result.current.shellLoading).toBe(false);
    });

    it('sets shellError when server action returns error', async () => {
      mockOpenShell.mockResolvedValue({ success: false, error: 'Shell not available' });

      const { result } = renderHook(() => useFeatureActions(mockInput));

      await act(async () => {
        await result.current.openInShell();
      });

      expect(result.current.shellError).toBe('Shell not available');
    });

    it('auto-clears shellError after 5 seconds', async () => {
      mockOpenShell.mockResolvedValue({ success: false, error: 'Shell not available' });

      const { result } = renderHook(() => useFeatureActions(mockInput));

      await act(async () => {
        await result.current.openInShell();
      });

      expect(result.current.shellError).toBe('Shell not available');

      act(() => {
        vi.advanceTimersByTime(5000);
      });

      expect(result.current.shellError).toBeNull();
    });

    it('clears shellError on next successful openInShell call', async () => {
      mockOpenShell.mockResolvedValue({ success: false, error: 'Shell not available' });

      const { result } = renderHook(() => useFeatureActions(mockInput));

      await act(async () => {
        await result.current.openInShell();
      });

      expect(result.current.shellError).toBe('Shell not available');

      mockOpenShell.mockResolvedValue({ success: true });

      await act(async () => {
        await result.current.openInShell();
      });

      expect(result.current.shellError).toBeNull();
    });

    it('is no-op when input is null', async () => {
      mockOpenShell.mockResolvedValue({ success: true });

      const { result } = renderHook(() => useFeatureActions(null));

      await act(async () => {
        await result.current.openInShell();
      });

      expect(mockOpenShell).not.toHaveBeenCalled();
      expect(result.current.shellLoading).toBe(false);
    });

    it('is no-op while shellLoading is true', async () => {
      let resolvePromise!: (value: { success: boolean }) => void;
      mockOpenShell.mockReturnValue(
        new Promise((resolve) => {
          resolvePromise = resolve;
        })
      );

      const { result } = renderHook(() => useFeatureActions(mockInput));

      act(() => {
        result.current.openInShell();
      });

      expect(result.current.shellLoading).toBe(true);
      expect(mockOpenShell).toHaveBeenCalledTimes(1);

      // Second call should be no-op
      await act(async () => {
        await result.current.openInShell();
      });

      expect(mockOpenShell).toHaveBeenCalledTimes(1);

      // Cleanup
      await act(async () => {
        resolvePromise({ success: true });
      });
    });

    it('catches network error and sets shellError', async () => {
      mockOpenShell.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useFeatureActions(mockInput));

      await act(async () => {
        await result.current.openInShell();
      });

      expect(result.current.shellError).toBe('Network error');
      expect(result.current.shellLoading).toBe(false);
    });
  });

  describe('timer cleanup', () => {
    it('cleans up auto-clear timers on unmount', async () => {
      mockOpenIde.mockResolvedValue({ success: false, error: 'IDE not installed' });

      const { result, unmount } = renderHook(() => useFeatureActions(mockInput));

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
