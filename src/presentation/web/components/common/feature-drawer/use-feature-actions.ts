'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { openIde } from '@/app/actions/open-ide';
import { openShell } from '@/app/actions/open-shell';
import { openFolder } from '@/app/actions/open-folder';
import { rebaseFeature } from '@/app/actions/rebase-feature';

export interface FeatureActionsInput {
  featureId: string;
  repositoryPath: string;
  branch: string;
  worktreePath?: string;
  specPath?: string;
}

export interface FeatureActionsState {
  openInIde: () => Promise<void>;
  openInShell: () => Promise<void>;
  openFolder: () => Promise<void>;
  openSpecsFolder: () => Promise<void>;
  rebaseOnMain: () => Promise<void>;
  ideLoading: boolean;
  shellLoading: boolean;
  folderLoading: boolean;
  specsLoading: boolean;
  rebaseLoading: boolean;
  ideError: string | null;
  shellError: string | null;
  folderError: string | null;
  specsError: string | null;
  rebaseError: string | null;
}

const ERROR_CLEAR_DELAY = 5000;

export function useFeatureActions(input: FeatureActionsInput | null): FeatureActionsState {
  const [ideLoading, setIdeLoading] = useState(false);
  const [shellLoading, setShellLoading] = useState(false);
  const [folderLoading, setFolderLoading] = useState(false);
  const [specsLoading, setSpecsLoading] = useState(false);
  const [rebaseLoading, setRebaseLoading] = useState(false);
  const [ideError, setIdeError] = useState<string | null>(null);
  const [shellError, setShellError] = useState<string | null>(null);
  const [folderError, setFolderError] = useState<string | null>(null);
  const [specsError, setSpecsError] = useState<string | null>(null);
  const [rebaseError, setRebaseError] = useState<string | null>(null);

  const ideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shellTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const folderTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const specsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rebaseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear timers on unmount — read .current inside cleanup so we get the
  // actual timer value at teardown time, not the always-null value at mount.
  useEffect(() => {
    const refs = [ideTimerRef, shellTimerRef, folderTimerRef, specsTimerRef, rebaseTimerRef];
    return () => {
      for (const ref of refs) {
        if (ref.current) clearTimeout(ref.current);
      }
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

  const handleOpenFolder = useCallback(async () => {
    if (!input || folderLoading) return;

    if (folderTimerRef.current) clearTimeout(folderTimerRef.current);

    setFolderLoading(true);
    setFolderError(null);

    try {
      const folderPath = input.worktreePath ?? input.repositoryPath;
      const result = await openFolder(folderPath);

      if (!result.success) {
        const errorMessage = result.error ?? 'An unexpected error occurred';
        setFolderError(errorMessage);
        folderTimerRef.current = setTimeout(() => setFolderError(null), ERROR_CLEAR_DELAY);
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setFolderError(errorMessage);
      folderTimerRef.current = setTimeout(() => setFolderError(null), ERROR_CLEAR_DELAY);
    } finally {
      setFolderLoading(false);
    }
  }, [input, folderLoading]);

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

  const handleRebaseOnMain = useCallback(async () => {
    if (!input?.featureId || rebaseLoading) return;

    if (rebaseTimerRef.current) clearTimeout(rebaseTimerRef.current);

    setRebaseLoading(true);
    setRebaseError(null);

    try {
      const result = await rebaseFeature(input.featureId);

      if (!result.success) {
        const errorMessage = result.error ?? 'An unexpected error occurred';
        setRebaseError(errorMessage);
        rebaseTimerRef.current = setTimeout(() => setRebaseError(null), ERROR_CLEAR_DELAY);
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setRebaseError(errorMessage);
      rebaseTimerRef.current = setTimeout(() => setRebaseError(null), ERROR_CLEAR_DELAY);
    } finally {
      setRebaseLoading(false);
    }
  }, [input, rebaseLoading]);

  return {
    openInIde: handleOpenIde,
    openInShell: handleOpenShell,
    openFolder: handleOpenFolder,
    openSpecsFolder: handleOpenSpecsFolder,
    rebaseOnMain: handleRebaseOnMain,
    ideLoading,
    shellLoading,
    folderLoading,
    specsLoading,
    rebaseLoading,
    ideError,
    shellError,
    folderError,
    specsError,
    rebaseError,
  };
}
