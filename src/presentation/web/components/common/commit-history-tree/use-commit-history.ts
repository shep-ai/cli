'use client';

import { useState, useEffect, useCallback } from 'react';
import { getRepositoryCommits } from '@/app/actions/get-repository-commits';
import type { RepositoryCommitsData } from '@/app/actions/get-repository-commits';

export interface UseCommitHistoryOptions {
  repositoryPath: string | undefined;
  branch?: string;
  limit?: number;
  /** Only fetch when enabled (e.g. when the tab is active) */
  enabled?: boolean;
}

export interface UseCommitHistoryState {
  data: RepositoryCommitsData | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useCommitHistory({
  repositoryPath,
  branch,
  limit = 50,
  enabled = true,
}: UseCommitHistoryOptions): UseCommitHistoryState {
  const [data, setData] = useState<RepositoryCommitsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!repositoryPath || !enabled) return;
    setLoading(true);
    setError(null);
    try {
      const result = await getRepositoryCommits(repositoryPath, branch, limit);
      if (result.success && result.data) {
        setData(result.data);
      } else {
        setError(result.error ?? 'Failed to load commit history');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load commit history');
    } finally {
      setLoading(false);
    }
  }, [repositoryPath, branch, limit, enabled]);

  useEffect(() => {
    void fetch();
  }, [fetch]);

  return { data, loading, error, refresh: fetch };
}
