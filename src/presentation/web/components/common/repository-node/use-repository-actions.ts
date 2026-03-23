'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { openIde } from '@/app/actions/open-ide';
import { openShell } from '@/app/actions/open-shell';
import { openFolder } from '@/app/actions/open-folder';
import { syncRepository } from '@/app/actions/sync-repository';

export interface RepositoryActionsInput {
  repositoryId?: string;
  repositoryPath: string;
}

export interface RepositoryActionsState {
  openInIde: () => Promise<void>;
  openInShell: () => Promise<void>;
  openFolder: () => Promise<void>;
  syncMain: () => Promise<void>;
  ideLoading: boolean;
  shellLoading: boolean;
  folderLoading: boolean;
  syncLoading: boolean;
  ideError: string | null;
  shellError: string | null;
  folderError: string | null;
  syncError: string | null;
}

const ERROR_CLEAR_DELAY = 5000;

export function useRepositoryActions(input: RepositoryActionsInput | null): RepositoryActionsState {
  const [ideLoading, setIdeLoading] = useState(false);
  const [shellLoading, setShellLoading] = useState(false);
  const [folderLoading, setFolderLoading] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);
  const [ideError, setIdeError] = useState<string | null>(null);
  const [shellError, setShellError] = useState<string | null>(null);
  const [folderError, setFolderError] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  const ideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shellTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const folderTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear timers on unmount
  useEffect(() => {
    const ideRef = ideTimerRef;
    const shellRef = shellTimerRef;
    const folderRef = folderTimerRef;
    const syncRef = syncTimerRef;
    return () => {
      if (ideRef.current) clearTimeout(ideRef.current);
      if (shellRef.current) clearTimeout(shellRef.current);
      if (folderRef.current) clearTimeout(folderRef.current);
      if (syncRef.current) clearTimeout(syncRef.current);
    };
  }, []);

  const performAction = useCallback(
    async (
      action: () => Promise<{ success: boolean; error?: string }>,
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
        const result = await action();

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
    () =>
      performAction(
        () => openIde({ repositoryPath: input!.repositoryPath }),
        setIdeLoading,
        setIdeError,
        ideTimerRef,
        ideLoading
      ),
    [performAction, ideLoading, input]
  );

  const handleOpenShell = useCallback(
    () =>
      performAction(
        () => openShell({ repositoryPath: input!.repositoryPath }),
        setShellLoading,
        setShellError,
        shellTimerRef,
        shellLoading
      ),
    [performAction, shellLoading, input]
  );

  const handleOpenFolder = useCallback(
    () =>
      performAction(
        () => openFolder(input!.repositoryPath),
        setFolderLoading,
        setFolderError,
        folderTimerRef,
        folderLoading
      ),
    [performAction, folderLoading, input]
  );

  const handleSyncMain = useCallback(
    () =>
      performAction(
        () => syncRepository(input!.repositoryId ?? ''),
        setSyncLoading,
        setSyncError,
        syncTimerRef,
        syncLoading
      ),
    [performAction, syncLoading, input]
  );

  return {
    openInIde: handleOpenIde,
    openInShell: handleOpenShell,
    openFolder: handleOpenFolder,
    syncMain: handleSyncMain,
    ideLoading,
    shellLoading,
    folderLoading,
    syncLoading,
    ideError,
    shellError,
    folderError,
    syncError,
  };
}
