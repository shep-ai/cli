'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { createLogger } from '@/lib/logger';
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

const log = createLogger('[useDeployAction]');

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
  const statusRef = useRef(status);

  // Keep statusRef in sync with latest status
  useEffect(() => {
    statusRef.current = status;
  }, [status]);

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

  // Fetch initial deployment status on mount (or when input changes) so we
  // pick up any already-running dev server that was started before this
  // component mounted. Without this, closing and reopening the drawer would
  // lose awareness of the running deployment.
  const pollAfterInitialFetchRef = useRef<((id: string) => void) | null>(null);
  const initialFetchIdRef = useRef<string | null>(null);
  useEffect(() => {
    const targetId = input?.targetId ?? null;
    // Only fetch once per targetId to avoid redundant calls
    if (targetId === initialFetchIdRef.current) return;
    initialFetchIdRef.current = targetId;

    if (!targetId) return;

    let cancelled = false;

    getDeploymentStatus(targetId).then((result) => {
      if (cancelled || !mountedRef.current) return;

      if (result && result.state !== 'Stopped') {
        log.info(`initial status fetch: state=${result.state}, url=${result.url}`);
        setStatus(result.state as DeploymentState);
        setUrl(result.url);
        // Start polling to keep the state fresh
        // (startPolling is defined below, but the effect runs after render
        //  so it will be available via the ref-based closure)
        pollAfterInitialFetchRef.current?.(targetId);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [input?.targetId]);

  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      log.debug('stopping polling');
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }, []);

  const startPolling = useCallback(
    (targetId: string) => {
      stopPolling();
      log.debug(`starting polling for "${targetId}" every ${POLL_INTERVAL}ms`);

      pollIntervalRef.current = setInterval(async () => {
        if (!mountedRef.current) {
          stopPolling();
          return;
        }

        const result = await getDeploymentStatus(targetId);

        if (!mountedRef.current) return;

        if (!result || result.state === 'Stopped') {
          log.info(
            `poll result: ${result ? `state=${result.state}` : 'null (deployment gone)'} — stopping poll`
          );
          setStatus(null);
          setUrl(null);
          stopPolling();
        } else {
          if (result.state !== statusRef.current) {
            log.info(
              `poll state changed: ${statusRef.current} → ${result.state}, url=${result.url}`
            );
          }
          setStatus(result.state as DeploymentState);
          setUrl(result.url);
        }
      }, POLL_INTERVAL);
    },
    [stopPolling]
  );

  // Keep ref in sync so the initial-fetch effect can start polling
  pollAfterInitialFetchRef.current = startPolling;

  const handleDeploy = useCallback(async () => {
    if (!input) {
      log.warn('deploy() called but input is null — no-op');
      return;
    }
    if (deployLoading) {
      log.warn('deploy() called but already loading — no-op');
      return;
    }

    log.info(
      `deploy() — targetType="${input.targetType}", targetId="${input.targetId}", repositoryPath="${input.repositoryPath}"`
    );

    if (errorTimerRef.current) clearTimeout(errorTimerRef.current);

    setDeployLoading(true);
    setDeployError(null);

    try {
      const result =
        input.targetType === 'feature'
          ? await deployFeature(input.targetId)
          : await deployRepository(input.repositoryPath);

      log.info('server action result:', result);

      if (!mountedRef.current) {
        log.warn('component unmounted after deploy — discarding result');
        return;
      }

      if (!result.success) {
        const errorMessage = result.error ?? 'An unexpected error occurred';
        log.error(`deploy failed: ${errorMessage}`);
        setDeployError(errorMessage);
        errorTimerRef.current = setTimeout(() => setDeployError(null), ERROR_CLEAR_DELAY);
      } else {
        log.info(`deploy succeeded — initial state=${result.state}, starting polling`);
        setStatus(result.state ?? null);
        setUrl(null);
        startPolling(input.targetId);
      }
    } catch (err: unknown) {
      if (!mountedRef.current) return;
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      log.error(`deploy threw exception: ${errorMessage}`, err);
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

    log.info(`stop() — targetId="${input.targetId}"`);
    setStopLoading(true);

    try {
      const result = await stopDeployment(input.targetId);
      log.info('stop result:', result);

      if (!mountedRef.current) return;

      if (result.success) {
        stopPolling();
        setStatus(null);
        setUrl(null);
      }
    } catch (err) {
      log.warn('stop error (non-critical):', err);
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
