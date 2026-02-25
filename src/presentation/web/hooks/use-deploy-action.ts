'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import type { DeploymentState } from '@shepai/core/domain/generated/output';
import { deployFeature } from '@/app/actions/deploy-feature';
import { deployRepository } from '@/app/actions/deploy-repository';
import { stopDeployment } from '@/app/actions/stop-deployment';
import { getDeploymentStatus } from '@/app/actions/get-deployment-status';

export interface DeployActionInput {
  targetId: string;
  targetType: 'feature' | 'repository';
  repositoryPath: string;
  branch?: string;
}

export interface DeployActionState {
  deploy: () => Promise<void>;
  stop: () => Promise<void>;
  deployLoading: boolean;
  stopLoading: boolean;
  deployError: string | null;
  status: DeploymentState | null;
  url: string | null;
}

const ERROR_CLEAR_DELAY = 5000;
const POLL_INTERVAL = 3000;

export function useDeployAction(input: DeployActionInput | null): DeployActionState {
  const [deployLoading, setDeployLoading] = useState(false);
  const [stopLoading, setStopLoading] = useState(false);
  const [deployError, setDeployError] = useState<string | null>(null);
  const [status, setStatus] = useState<DeploymentState | null>(null);
  const [url, setUrl] = useState<string | null>(null);

  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);

  // Track mounted state
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }, []);

  const startPolling = useCallback(
    (targetId: string) => {
      stopPolling();

      pollIntervalRef.current = setInterval(async () => {
        if (!mountedRef.current) {
          stopPolling();
          return;
        }

        const result = await getDeploymentStatus(targetId);

        if (!mountedRef.current) return;

        if (!result || result.state === 'Stopped') {
          setStatus(null);
          setUrl(null);
          stopPolling();
        } else {
          setStatus(result.state as DeploymentState);
          setUrl(result.url);
        }
      }, POLL_INTERVAL);
    },
    [stopPolling]
  );

  const handleDeploy = useCallback(async () => {
    if (!input || deployLoading) return;

    if (errorTimerRef.current) clearTimeout(errorTimerRef.current);

    setDeployLoading(true);
    setDeployError(null);

    try {
      const result =
        input.targetType === 'feature'
          ? await deployFeature(input.targetId)
          : await deployRepository(input.repositoryPath);

      if (!mountedRef.current) return;

      if (!result.success) {
        const errorMessage = result.error ?? 'An unexpected error occurred';
        setDeployError(errorMessage);
        errorTimerRef.current = setTimeout(() => setDeployError(null), ERROR_CLEAR_DELAY);
      } else {
        setStatus(result.state ?? null);
        setUrl(null);
        startPolling(input.targetId);
      }
    } catch (err: unknown) {
      if (!mountedRef.current) return;
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setDeployError(errorMessage);
      errorTimerRef.current = setTimeout(() => setDeployError(null), ERROR_CLEAR_DELAY);
    } finally {
      if (mountedRef.current) {
        setDeployLoading(false);
      }
    }
  }, [input, deployLoading, startPolling]);

  const handleStop = useCallback(async () => {
    if (!input || stopLoading) return;

    setStopLoading(true);

    try {
      const result = await stopDeployment(input.targetId);

      if (!mountedRef.current) return;

      if (result.success) {
        stopPolling();
        setStatus(null);
        setUrl(null);
      }
    } catch {
      // Stop errors are non-critical; process may have already exited
    } finally {
      if (mountedRef.current) {
        setStopLoading(false);
      }
    }
  }, [input, stopLoading, stopPolling]);

  return {
    deploy: handleDeploy,
    stop: handleStop,
    deployLoading,
    stopLoading,
    deployError,
    status,
    url,
  };
}
