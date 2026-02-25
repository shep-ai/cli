'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { openIde } from '@/app/actions/open-ide';
import { openShell } from '@/app/actions/open-shell';
import { openFolder } from '@/app/actions/open-folder';

export interface FeatureActionsInput {
  repositoryPath: string;
  branch: string;
  specPath?: string;
  featureId?: string;
}

export type BrowserEditorStatus = 'running' | 'stopped' | null;

export interface FeatureActionsState {
  openInIde: () => Promise<void>;
  openInShell: () => Promise<void>;
  openSpecsFolder: () => Promise<void>;
  openBrowserEditor: () => Promise<void>;
  stopBrowserEditor: () => Promise<void>;
  ideLoading: boolean;
  shellLoading: boolean;
  specsLoading: boolean;
  browserEditorLoading: boolean;
  ideError: string | null;
  shellError: string | null;
  specsError: string | null;
  browserEditorError: string | null;
  browserEditorStatus: BrowserEditorStatus;
}

const ERROR_CLEAR_DELAY = 5000;

export function useFeatureActions(input: FeatureActionsInput | null): FeatureActionsState {
  const [ideLoading, setIdeLoading] = useState(false);
  const [shellLoading, setShellLoading] = useState(false);
  const [specsLoading, setSpecsLoading] = useState(false);
  const [browserEditorLoading, setBrowserEditorLoading] = useState(false);
  const [ideError, setIdeError] = useState<string | null>(null);
  const [shellError, setShellError] = useState<string | null>(null);
  const [specsError, setSpecsError] = useState<string | null>(null);
  const [browserEditorError, setBrowserEditorError] = useState<string | null>(null);
  const [browserEditorStatus, setBrowserEditorStatus] = useState<BrowserEditorStatus>(null);

  const ideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shellTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const specsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const browserEditorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear timers on unmount
  useEffect(() => {
    const ideTimer = ideTimerRef.current;
    const shellTimer = shellTimerRef.current;
    const specsTimer = specsTimerRef.current;
    const browserEditorTimer = browserEditorTimerRef.current;
    return () => {
      if (ideTimer) clearTimeout(ideTimer);
      if (shellTimer) clearTimeout(shellTimer);
      if (specsTimer) clearTimeout(specsTimer);
      if (browserEditorTimer) clearTimeout(browserEditorTimer);
    };
  }, []);

  // Fetch browser editor status on mount / when featureId changes
  useEffect(() => {
    if (!input?.featureId) {
      setBrowserEditorStatus(null);
      return;
    }

    const featureId = input.featureId;
    let cancelled = false;

    async function fetchStatus() {
      try {
        const res = await fetch(
          `/api/code-server/status?featureId=${encodeURIComponent(featureId)}`
        );
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (!cancelled) {
          setBrowserEditorStatus(data?.status === 'running' ? 'running' : 'stopped');
        }
      } catch {
        // Silently fail — status will show as null (unknown)
      }
    }

    void fetchStatus();
    return () => {
      cancelled = true;
    };
  }, [input?.featureId]);

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

  const fetchBrowserEditorStatus = useCallback(async () => {
    if (!input?.featureId) return;
    try {
      const res = await fetch(
        `/api/code-server/status?featureId=${encodeURIComponent(input.featureId)}`
      );
      if (!res.ok) return;
      const data = await res.json();
      setBrowserEditorStatus(data?.status === 'running' ? 'running' : 'stopped');
    } catch {
      // Silently fail
    }
  }, [input?.featureId]);

  const handleOpenBrowserEditor = useCallback(async () => {
    if (!input?.featureId || browserEditorLoading) return;

    if (browserEditorTimerRef.current) clearTimeout(browserEditorTimerRef.current);

    setBrowserEditorLoading(true);
    setBrowserEditorError(null);

    try {
      const res = await fetch('/api/code-server/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          featureId: input.featureId,
          repositoryPath: input.repositoryPath,
          branch: input.branch,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        const errorMessage = data?.error ?? 'Failed to start browser editor';
        setBrowserEditorError(errorMessage);
        browserEditorTimerRef.current = setTimeout(
          () => setBrowserEditorError(null),
          ERROR_CLEAR_DELAY
        );
        return;
      }

      // Open code-server in a new tab
      if (data?.url) {
        window.open(data.url, '_blank');
      }

      await fetchBrowserEditorStatus();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start browser editor';
      setBrowserEditorError(errorMessage);
      browserEditorTimerRef.current = setTimeout(
        () => setBrowserEditorError(null),
        ERROR_CLEAR_DELAY
      );
    } finally {
      setBrowserEditorLoading(false);
    }
  }, [input, browserEditorLoading, fetchBrowserEditorStatus]);

  const handleStopBrowserEditor = useCallback(async () => {
    if (!input?.featureId || browserEditorLoading) return;

    if (browserEditorTimerRef.current) clearTimeout(browserEditorTimerRef.current);

    setBrowserEditorLoading(true);
    setBrowserEditorError(null);

    try {
      const res = await fetch('/api/code-server/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ featureId: input.featureId }),
      });

      if (!res.ok) {
        const data = await res.json();
        const errorMessage = data?.error ?? 'Failed to stop browser editor';
        setBrowserEditorError(errorMessage);
        browserEditorTimerRef.current = setTimeout(
          () => setBrowserEditorError(null),
          ERROR_CLEAR_DELAY
        );
        return;
      }

      await fetchBrowserEditorStatus();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to stop browser editor';
      setBrowserEditorError(errorMessage);
      browserEditorTimerRef.current = setTimeout(
        () => setBrowserEditorError(null),
        ERROR_CLEAR_DELAY
      );
    } finally {
      setBrowserEditorLoading(false);
    }
  }, [input, browserEditorLoading, fetchBrowserEditorStatus]);

  return {
    openInIde: handleOpenIde,
    openInShell: handleOpenShell,
    openSpecsFolder: handleOpenSpecsFolder,
    openBrowserEditor: handleOpenBrowserEditor,
    stopBrowserEditor: handleStopBrowserEditor,
    ideLoading,
    shellLoading,
    specsLoading,
    browserEditorLoading,
    ideError,
    shellError,
    specsError,
    browserEditorError,
    browserEditorStatus,
  };
}
