'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { openIde } from '@/app/actions/open-ide';
import { openShell } from '@/app/actions/open-shell';
import { openFolder } from '@/app/actions/open-folder';

export interface RepositoryActionsInput {
  repositoryPath: string;
}

export interface RepositoryActionsState {
  openInIde: () => Promise<void>;
  openInShell: () => Promise<void>;
  openFolder: () => Promise<void>;
  ideLoading: boolean;
  shellLoading: boolean;
  folderLoading: boolean;
  ideError: string | null;
  shellError: string | null;
  folderError: string | null;
}

const ERROR_CLEAR_DELAY = 5000;

export function useRepositoryActions(input: RepositoryActionsInput | null): RepositoryActionsState {
  const [ideLoading, setIdeLoading] = useState(false);
  const [shellLoading, setShellLoading] = useState(false);
  const [folderLoading, setFolderLoading] = useState(false);
  const [ideError, setIdeError] = useState<string | null>(null);
  const [shellError, setShellError] = useState<string | null>(null);
  const [folderError, setFolderError] = useState<string | null>(null);

  const ideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shellTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const folderTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear timers on unmount
  useEffect(() => {
    const ideTimer = ideTimerRef.current;
    const shellTimer = shellTimerRef.current;
    const folderTimer = folderTimerRef.current;
    return () => {
      if (ideTimer) clearTimeout(ideTimer);
      if (shellTimer) clearTimeout(shellTimer);
      if (folderTimer) clearTimeout(folderTimer);
    };
  }, []);

  const performToolbarAction = useCallback(
    async (
      action: (input: { repositoryPath: string }) => Promise<{
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
        const result = await action({ repositoryPath: input.repositoryPath });

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

  const performFolderAction = useCallback(
    async (
      action: (repositoryPath: string) => Promise<{ success: boolean; error?: string }>,
      setLoading: (v: boolean) => void,
      setError: (v: string | null) => void,
      timerRef: React.RefObject<ReturnType<typeof setTimeout> | null>,
      isLoading: boolean
    ) => {
      if (!input || isLoading) return;

      if (timerRef.current) clearTimeout(timerRef.current);

      setLoading(true);
      setError(null);

      try {
        const result = await action(input.repositoryPath);

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
    () => performToolbarAction(openIde, setIdeLoading, setIdeError, ideTimerRef, ideLoading),
    [performToolbarAction, ideLoading]
  );

  const handleOpenShell = useCallback(
    () =>
      performToolbarAction(openShell, setShellLoading, setShellError, shellTimerRef, shellLoading),
    [performToolbarAction, shellLoading]
  );

  const handleOpenFolder = useCallback(
    () =>
      performFolderAction(
        openFolder,
        setFolderLoading,
        setFolderError,
        folderTimerRef,
        folderLoading
      ),
    [performFolderAction, folderLoading]
  );

  return {
    openInIde: handleOpenIde,
    openInShell: handleOpenShell,
    openFolder: handleOpenFolder,
    ideLoading,
    shellLoading,
    folderLoading,
    ideError,
    shellError,
    folderError,
  };
}
