'use client';

import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';

/**
 * Generic hook for fetching drawer artifact data when a feature ID changes.
 * Handles loading state, cancellation on unmount/re-fetch, and error toasting.
 *
 * @param featureId - The feature ID to fetch for, or null to reset.
 * @param fetcher - Async function that fetches the artifact data.
 * @param onSuccess - Called with the fetch result when successful and not cancelled.
 * @param onReset - Called immediately when featureId changes (before fetching).
 * @param errorMessage - Optional toast message shown on fetch failure.
 * @param refreshKey - Optional key that forces a re-fetch when it changes (even if featureId is the same).
 * @returns Whether the fetch is currently in progress.
 */
export function useArtifactFetch<TResult>(
  featureId: string | null,
  fetcher: (id: string) => Promise<TResult>,
  onSuccess: (result: TResult) => void,
  onReset: () => void,
  errorMessage?: string,
  refreshKey?: number
): boolean {
  const [isLoading, setIsLoading] = useState(false);

  // Use refs to avoid stale callbacks in the effect without triggering re-runs.
  const onSuccessRef = useRef(onSuccess);
  const onResetRef = useRef(onReset);
  onSuccessRef.current = onSuccess;
  onResetRef.current = onReset;

  useEffect(() => {
    onResetRef.current();
    if (!featureId) return;

    let cancelled = false;
    setIsLoading(true);

    fetcher(featureId)
      .then((result) => {
        if (!cancelled) onSuccessRef.current(result);
      })
      .catch(() => {
        if (!cancelled && errorMessage) toast.error(errorMessage);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [featureId, fetcher, errorMessage, refreshKey]);

  return isLoading;
}
