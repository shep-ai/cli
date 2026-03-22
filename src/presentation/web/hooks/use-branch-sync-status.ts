'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { getBranchSyncStatus } from '@/app/actions/get-branch-sync-status';

export interface BranchSyncData {
  ahead: number;
  behind: number;
  baseBranch: string;
  checkedAt: string;
}

export interface UseBranchSyncStatusResult {
  data: BranchSyncData | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

const CACHE_TTL_MS = 30_000;

/** Module-level cache so data survives component remounts / drawer close-reopen. */
const cache = new Map<string, { data: BranchSyncData; timestamp: number }>();

export function useBranchSyncStatus(featureId: string | null): UseBranchSyncStatusResult {
  const [data, setData] = useState<BranchSyncData | null>(() => {
    if (!featureId) return null;
    const cached = cache.get(featureId);
    return cached ? cached.data : null;
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const featureIdRef = useRef(featureId);
  featureIdRef.current = featureId;

  const fetchStatus = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await getBranchSyncStatus(id);
      // Guard against stale responses if featureId changed during fetch
      if (featureIdRef.current !== id) return;
      if (result.success && result.data) {
        const syncData: BranchSyncData = result.data;
        cache.set(id, { data: syncData, timestamp: Date.now() });
        setData(syncData);
      } else {
        setError(result.error ?? 'Failed to check sync status');
      }
    } catch {
      if (featureIdRef.current !== id) return;
      setError('Failed to check sync status');
    } finally {
      if (featureIdRef.current === id) {
        setLoading(false);
      }
    }
  }, []);

  // Auto-fetch on mount if cache is stale
  useEffect(() => {
    if (!featureId) {
      setData(null);
      setError(null);
      return;
    }

    const cached = cache.get(featureId);
    if (cached) {
      setData(cached.data);
      if (Date.now() - cached.timestamp < CACHE_TTL_MS) return;
    }

    void fetchStatus(featureId);
  }, [featureId, fetchStatus]);

  const refresh = useCallback(() => {
    if (featureId) {
      void fetchStatus(featureId);
    }
  }, [featureId, fetchStatus]);

  return { data, loading, error, refresh };
}
