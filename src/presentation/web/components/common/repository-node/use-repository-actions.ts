'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

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

  const performAction = useCallback(
    async (
      url: string,
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
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            repositoryPath: input.repositoryPath,
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          const errorMessage = data.error ?? 'An unexpected error occurred';
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

  const openInIde = useCallback(
    () => performAction('/api/ide/open', setIdeLoading, setIdeError, ideTimerRef, ideLoading),
    [performAction, ideLoading]
  );

  const openInShell = useCallback(
    () =>
      performAction('/api/shell/open', setShellLoading, setShellError, shellTimerRef, shellLoading),
    [performAction, shellLoading]
  );

  const openFolder = useCallback(
    () =>
      performAction(
        '/api/folder/open',
        setFolderLoading,
        setFolderError,
        folderTimerRef,
        folderLoading
      ),
    [performAction, folderLoading]
  );

  return {
    openInIde,
    openInShell,
    openFolder,
    ideLoading,
    shellLoading,
    folderLoading,
    ideError,
    shellError,
    folderError,
  };
}
