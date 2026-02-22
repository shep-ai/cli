'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { openIde } from '@/app/actions/open-ide';
import { openShell } from '@/app/actions/open-shell';
import { openFolder } from '@/app/actions/open-folder';

export interface FeatureActionsInput {
  repositoryPath: string;
  branch: string;
  specPath?: string;
}

export interface FeatureActionsState {
  openInIde: () => Promise<void>;
  openInShell: () => Promise<void>;
  openSpecsFolder: () => Promise<void>;
  ideLoading: boolean;
  shellLoading: boolean;
  specsLoading: boolean;
  ideError: string | null;
  shellError: string | null;
  specsError: string | null;
}

const ERROR_CLEAR_DELAY = 5000;

export function useFeatureActions(input: FeatureActionsInput | null): FeatureActionsState {
  const [ideLoading, setIdeLoading] = useState(false);
  const [shellLoading, setShellLoading] = useState(false);
  const [specsLoading, setSpecsLoading] = useState(false);
  const [ideError, setIdeError] = useState<string | null>(null);
  const [shellError, setShellError] = useState<string | null>(null);
  const [specsError, setSpecsError] = useState<string | null>(null);

  const ideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shellTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const specsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear timers on unmount
  useEffect(() => {
    const ideTimer = ideTimerRef.current;
    const shellTimer = shellTimerRef.current;
    const specsTimer = specsTimerRef.current;
    return () => {
      if (ideTimer) clearTimeout(ideTimer);
      if (shellTimer) clearTimeout(shellTimer);
      if (specsTimer) clearTimeout(specsTimer);
    };
  }, []);

  const performAction = useCallback(
    async (
      action: (input: { repositoryPath: string; branch?: string }) => Promise<{
        success: boolean;
        error?: string;
      }>,
      setLoading: (v: boolean) => void,
      setError: (v: string | null) => void,
      timerRef: React.RefObject<ReturnType<typeof setTimeout> | null>,
      isLoading: boolean
    ) => {
      if (!input || isLoading) return;

      // Clear any existing timer
      if (timerRef.current) clearTimeout(timerRef.current);

      setLoading(true);
      setError(null);

      try {
        const result = await action({
          repositoryPath: input.repositoryPath,
          branch: input.branch,
        });

        if (!result.success) {
          const errorMessage = result.error ?? 'An unexpected error occurred';
          setError(errorMessage);
          timerRef.current = setTimeout(() => setError(null), ERROR_CLEAR_DELAY);
        }
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
        setError(errorMessage);
        timerRef.current = setTimeout(() => setError(null), ERROR_CLEAR_DELAY);
      } finally {
        setLoading(false);
      }
    },
    [input]
  );

  const handleOpenIde = useCallback(
    () => performAction(openIde, setIdeLoading, setIdeError, ideTimerRef, ideLoading),
    [performAction, ideLoading]
  );

  const handleOpenShell = useCallback(
    () => performAction(openShell, setShellLoading, setShellError, shellTimerRef, shellLoading),
    [performAction, shellLoading]
  );

  const handleOpenSpecsFolder = useCallback(async () => {
    if (!input?.specPath || specsLoading) return;

    if (specsTimerRef.current) clearTimeout(specsTimerRef.current);

    setSpecsLoading(true);
    setSpecsError(null);

    try {
      const result = await openFolder(input.specPath);

      if (!result.success) {
        const errorMessage = result.error ?? 'An unexpected error occurred';
        setSpecsError(errorMessage);
        specsTimerRef.current = setTimeout(() => setSpecsError(null), ERROR_CLEAR_DELAY);
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setSpecsError(errorMessage);
      specsTimerRef.current = setTimeout(() => setSpecsError(null), ERROR_CLEAR_DELAY);
    } finally {
      setSpecsLoading(false);
    }
  }, [input, specsLoading]);

  return {
    openInIde: handleOpenIde,
    openInShell: handleOpenShell,
    openSpecsFolder: handleOpenSpecsFolder,
    ideLoading,
    shellLoading,
    specsLoading,
    ideError,
    shellError,
    specsError,
  };
}
