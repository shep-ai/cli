import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  useTabDataFetch,
  type TabFetchers,
} from '@/components/common/feature-drawer-tabs/use-tab-data-fetch';

type TabKeys = 'activity' | 'messages' | 'plan';
type MockFetcher = ReturnType<typeof vi.fn<(id: string) => Promise<unknown>>>;

describe('useTabDataFetch', () => {
  let activityFetcher: MockFetcher;
  let messagesFetcher: MockFetcher;
  let planFetcher: MockFetcher;

  beforeEach(() => {
    vi.clearAllMocks();
    activityFetcher = vi.fn<(id: string) => Promise<unknown>>().mockResolvedValue({ timings: [] });
    messagesFetcher = vi.fn<(id: string) => Promise<unknown>>().mockResolvedValue({ messages: [] });
    planFetcher = vi.fn<(id: string) => Promise<unknown>>().mockResolvedValue({ plan: undefined });
  });

  function createFetchers(): TabFetchers<TabKeys> {
    return {
      activity: activityFetcher,
      messages: messagesFetcher,
      plan: planFetcher,
    };
  }

  describe('fetchTab', () => {
    it('invokes the fetcher for the requested tab', async () => {
      const { result } = renderHook(() => useTabDataFetch('feat-1', createFetchers()));

      await act(async () => {
        await result.current.fetchTab('activity');
      });

      expect(activityFetcher).toHaveBeenCalledWith('feat-1');
      expect(messagesFetcher).not.toHaveBeenCalled();
      expect(planFetcher).not.toHaveBeenCalled();
    });

    it('does NOT invoke the fetcher again on second call (cache hit)', async () => {
      const { result } = renderHook(() => useTabDataFetch('feat-1', createFetchers()));

      await act(async () => {
        await result.current.fetchTab('activity');
      });

      await act(async () => {
        await result.current.fetchTab('activity');
      });

      expect(activityFetcher).toHaveBeenCalledTimes(1);
    });

    it('returns cached data on second call without re-fetching', async () => {
      const mockTimings = { timings: [{ phase: 'planning', durationMs: 100 }] };
      activityFetcher.mockResolvedValue(mockTimings);

      const { result } = renderHook(() => useTabDataFetch('feat-1', createFetchers()));

      await act(async () => {
        await result.current.fetchTab('activity');
      });

      expect(result.current.tabs.activity.data).toEqual(mockTimings);

      await act(async () => {
        await result.current.fetchTab('activity');
      });

      // Data is still the same, fetcher was not called again
      expect(result.current.tabs.activity.data).toEqual(mockTimings);
      expect(activityFetcher).toHaveBeenCalledTimes(1);
    });

    it('fetches different tabs independently', async () => {
      const { result } = renderHook(() => useTabDataFetch('feat-1', createFetchers()));

      await act(async () => {
        await result.current.fetchTab('activity');
      });

      await act(async () => {
        await result.current.fetchTab('messages');
      });

      expect(activityFetcher).toHaveBeenCalledTimes(1);
      expect(messagesFetcher).toHaveBeenCalledTimes(1);
    });
  });

  describe('loading state', () => {
    it('is true while fetcher is in progress, false after completion', async () => {
      let resolveFetch!: (value: unknown) => void;
      activityFetcher.mockReturnValue(
        new Promise((resolve) => {
          resolveFetch = resolve;
        })
      );

      const { result } = renderHook(() => useTabDataFetch('feat-1', createFetchers()));

      expect(result.current.tabs.activity.loading).toBe(false);

      let fetchPromise: Promise<void>;
      act(() => {
        fetchPromise = result.current.fetchTab('activity');
      });

      expect(result.current.tabs.activity.loading).toBe(true);

      await act(async () => {
        resolveFetch({ timings: [] });
        await fetchPromise!;
      });

      expect(result.current.tabs.activity.loading).toBe(false);
    });

    it('is false initially for all tabs', () => {
      const { result } = renderHook(() => useTabDataFetch('feat-1', createFetchers()));

      expect(result.current.tabs.activity.loading).toBe(false);
      expect(result.current.tabs.messages.loading).toBe(false);
      expect(result.current.tabs.plan.loading).toBe(false);
    });
  });

  describe('error state', () => {
    it('is populated when fetcher throws', async () => {
      activityFetcher.mockRejectedValue(new Error('Network failure'));

      const { result } = renderHook(() => useTabDataFetch('feat-1', createFetchers()));

      await act(async () => {
        await result.current.fetchTab('activity');
      });

      expect(result.current.tabs.activity.error).toBe('Network failure');
      expect(result.current.tabs.activity.data).toBeNull();
      expect(result.current.tabs.activity.loading).toBe(false);
    });

    it('is null when fetcher succeeds', async () => {
      const { result } = renderHook(() => useTabDataFetch('feat-1', createFetchers()));

      await act(async () => {
        await result.current.fetchTab('activity');
      });

      expect(result.current.tabs.activity.error).toBeNull();
    });

    it('uses fallback message for non-Error throws', async () => {
      activityFetcher.mockRejectedValue('something bad');

      const { result } = renderHook(() => useTabDataFetch('feat-1', createFetchers()));

      await act(async () => {
        await result.current.fetchTab('activity');
      });

      expect(result.current.tabs.activity.error).toBe('Failed to fetch tab data');
    });
  });

  describe('featureId change', () => {
    it('clears all cached data when featureId changes', async () => {
      const mockTimings = { timings: [{ phase: 'planning' }] };
      activityFetcher.mockResolvedValue(mockTimings);

      const { result, rerender } = renderHook(
        ({ featureId }) => useTabDataFetch(featureId, createFetchers()),
        { initialProps: { featureId: 'feat-1' } }
      );

      await act(async () => {
        await result.current.fetchTab('activity');
      });

      expect(result.current.tabs.activity.data).toEqual(mockTimings);

      // Change featureId
      rerender({ featureId: 'feat-2' });

      expect(result.current.tabs.activity.data).toBeNull();
      expect(result.current.tabs.activity.loading).toBe(false);
      expect(result.current.tabs.activity.error).toBeNull();
    });

    it('allows re-fetching after featureId changes', async () => {
      activityFetcher.mockResolvedValue({ timings: [{ phase: 'first' }] });

      const { result, rerender } = renderHook(
        ({ featureId }) => useTabDataFetch(featureId, createFetchers()),
        { initialProps: { featureId: 'feat-1' } }
      );

      await act(async () => {
        await result.current.fetchTab('activity');
      });

      expect(activityFetcher).toHaveBeenCalledTimes(1);

      activityFetcher.mockResolvedValue({ timings: [{ phase: 'second' }] });

      // Change featureId — cache is cleared
      rerender({ featureId: 'feat-2' });

      await act(async () => {
        await result.current.fetchTab('activity');
      });

      // Fetcher called again for the new featureId
      expect(activityFetcher).toHaveBeenCalledTimes(2);
      expect(activityFetcher).toHaveBeenLastCalledWith('feat-2');
      expect(result.current.tabs.activity.data).toEqual({ timings: [{ phase: 'second' }] });
    });

    it('clears data for all tabs, not just the one that was fetched', async () => {
      activityFetcher.mockResolvedValue({ timings: [] });
      messagesFetcher.mockResolvedValue({ messages: ['hello'] });

      const { result, rerender } = renderHook(
        ({ featureId }) => useTabDataFetch(featureId, createFetchers()),
        { initialProps: { featureId: 'feat-1' } }
      );

      await act(async () => {
        await result.current.fetchTab('activity');
      });
      await act(async () => {
        await result.current.fetchTab('messages');
      });

      expect(result.current.tabs.activity.data).toBeTruthy();
      expect(result.current.tabs.messages.data).toBeTruthy();

      rerender({ featureId: 'feat-2' });

      expect(result.current.tabs.activity.data).toBeNull();
      expect(result.current.tabs.messages.data).toBeNull();
      expect(result.current.tabs.plan.data).toBeNull();
    });
  });

  describe('refreshTab', () => {
    it('re-invokes the fetcher for the specified tab, bypassing cache', async () => {
      activityFetcher.mockResolvedValue({ timings: [{ phase: 'v1' }] });

      const { result } = renderHook(() => useTabDataFetch('feat-1', createFetchers()));

      // First fetch
      await act(async () => {
        await result.current.fetchTab('activity');
      });

      expect(activityFetcher).toHaveBeenCalledTimes(1);

      activityFetcher.mockResolvedValue({ timings: [{ phase: 'v2' }] });

      // Refresh
      await act(async () => {
        await result.current.refreshTab('activity');
      });

      expect(activityFetcher).toHaveBeenCalledTimes(2);
      expect(result.current.tabs.activity.data).toEqual({ timings: [{ phase: 'v2' }] });
    });

    it('does not affect other tabs when refreshing one', async () => {
      activityFetcher.mockResolvedValue({ timings: [] });
      messagesFetcher.mockResolvedValue({ messages: ['hello'] });

      const { result } = renderHook(() => useTabDataFetch('feat-1', createFetchers()));

      await act(async () => {
        await result.current.fetchTab('activity');
      });
      await act(async () => {
        await result.current.fetchTab('messages');
      });

      const messagesDataBefore = result.current.tabs.messages.data;

      await act(async () => {
        await result.current.refreshTab('activity');
      });

      // Messages tab data is untouched
      expect(result.current.tabs.messages.data).toEqual(messagesDataBefore);
      expect(messagesFetcher).toHaveBeenCalledTimes(1);
    });
  });

  describe('ref-based callback stability', () => {
    it('uses updated fetcher without triggering re-fetch', async () => {
      const firstFetcher = vi
        .fn<(id: string) => Promise<unknown>>()
        .mockResolvedValue({ timings: [{ phase: 'first' }] });
      const secondFetcher = vi
        .fn<(id: string) => Promise<unknown>>()
        .mockResolvedValue({ timings: [{ phase: 'second' }] });

      const { result, rerender } = renderHook(
        ({ fetchers }) => useTabDataFetch('feat-1', fetchers),
        {
          initialProps: {
            fetchers: {
              activity: firstFetcher,
              messages: messagesFetcher,
              plan: planFetcher,
            } as TabFetchers<TabKeys>,
          },
        }
      );

      // Update the fetcher function (simulates parent re-render with new callback)
      rerender({
        fetchers: {
          activity: secondFetcher,
          messages: messagesFetcher,
          plan: planFetcher,
        } as TabFetchers<TabKeys>,
      });

      // Fetch should use the updated (second) fetcher
      await act(async () => {
        await result.current.fetchTab('activity');
      });

      expect(firstFetcher).not.toHaveBeenCalled();
      expect(secondFetcher).toHaveBeenCalledWith('feat-1');
    });
  });

  describe('unmount safety', () => {
    it('does not update state after unmount', async () => {
      let resolveFetch!: (value: unknown) => void;
      activityFetcher.mockReturnValue(
        new Promise((resolve) => {
          resolveFetch = resolve;
        })
      );

      const { result, unmount } = renderHook(() => useTabDataFetch('feat-1', createFetchers()));

      act(() => {
        result.current.fetchTab('activity');
      });

      unmount();

      // Resolving after unmount should not throw
      await act(async () => {
        resolveFetch({ timings: [] });
      });

      // No assertion needed — test passes if no "state update on unmounted" warning
    });
  });
});
