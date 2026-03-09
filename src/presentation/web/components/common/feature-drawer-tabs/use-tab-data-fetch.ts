'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

/** State for a single tab's data, loading, and error. */
export interface TabState<T = unknown> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

/** A function that fetches data for a tab given a feature ID. */
export type TabFetcher<T = unknown> = (featureId: string) => Promise<T>;

/** Map of tab keys to their fetcher functions. */
export type TabFetchers<K extends string> = Record<K, TabFetcher>;

/** Return type of the useTabDataFetch hook. */
export interface UseTabDataFetchResult<K extends string> {
  /** Per-tab state (data, loading, error). */
  tabs: Record<K, TabState>;
  /** Fetch data for a tab. Uses cache if already fetched. */
  fetchTab: (tab: K) => Promise<void>;
  /** Force re-fetch for a tab, bypassing cache. */
  refreshTab: (tab: K) => Promise<void>;
}

function createInitialTabState(): TabState {
  return { data: null, loading: false, error: null };
}

/**
 * Custom hook for lazy-loading tab data with per-tab caching.
 *
 * - Fetches data only when a tab is explicitly activated via fetchTab().
 * - Caches results so revisiting a loaded tab is instant.
 * - Clears all cached data when featureId changes.
 * - Supports force re-fetch via refreshTab() for SSE-driven updates.
 * - Uses ref-based callbacks to avoid stale closures (matches useArtifactFetch pattern).
 */
export function useTabDataFetch<K extends string>(
  featureId: string,
  fetchers: TabFetchers<K>
): UseTabDataFetchResult<K> {
  const tabKeys = Object.keys(fetchers) as K[];

  const [tabStates, setTabStates] = useState<Record<K, TabState>>(() => {
    const initial = {} as Record<K, TabState>;
    for (const key of tabKeys) {
      initial[key] = createInitialTabState();
    }
    return initial;
  });

  // Ref-based fetchers to avoid stale closures in callbacks.
  const fetchersRef = useRef(fetchers);
  fetchersRef.current = fetchers;

  // Ref-based featureId to use current value in callbacks.
  const featureIdRef = useRef(featureId);
  featureIdRef.current = featureId;

  // Track mounted state to prevent state updates after unmount.
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Clear all cached data when featureId changes.
  const prevFeatureIdRef = useRef(featureId);
  useEffect(() => {
    if (prevFeatureIdRef.current !== featureId) {
      prevFeatureIdRef.current = featureId;
      setTabStates((prev) => {
        const cleared = {} as Record<K, TabState>;
        for (const key of Object.keys(prev) as K[]) {
          cleared[key] = createInitialTabState();
        }
        return cleared;
      });
    }
  }, [featureId]);

  const doFetch = useCallback(async (tab: K) => {
    const fetcher = fetchersRef.current[tab];
    const currentFeatureId = featureIdRef.current;

    if (!fetcher) return;

    if (mountedRef.current) {
      setTabStates((prev) => ({
        ...prev,
        [tab]: { ...prev[tab], loading: true, error: null },
      }));
    }

    try {
      const data = await fetcher(currentFeatureId);
      if (mountedRef.current) {
        setTabStates((prev) => ({
          ...prev,
          [tab]: { data, loading: false, error: null },
        }));
      }
    } catch (error: unknown) {
      if (mountedRef.current) {
        const message = error instanceof Error ? error.message : 'Failed to fetch tab data';
        setTabStates((prev) => ({
          ...prev,
          [tab]: { data: null, loading: false, error: message },
        }));
      }
    }
  }, []);

  const fetchTab = useCallback(
    async (tab: K) => {
      // Check if data is already cached (non-null data means already fetched)
      const current = tabStates[tab];
      if (current && current.data !== null) return;
      // Also skip if currently loading
      if (current && current.loading) return;
      await doFetch(tab);
    },
    [tabStates, doFetch]
  );

  const refreshTab = useCallback(
    async (tab: K) => {
      await doFetch(tab);
    },
    [doFetch]
  );

  return {
    tabs: tabStates,
    fetchTab,
    refreshTab,
  };
}
