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

  // Fetch status on mount — recover running dev servers after page reload
  useEffect(() => {
    if (!input) return;
    let cancelled = false;

    (async () => {
      try {
        const result = await getDeploymentStatus(input.targetId);
        if (cancelled || !mountedRef.current) return;
        if (result && result.state !== 'Stopped') {
          log.info(`mount recovery: "${input.targetId}" state=${result.state}, url=${result.url}`);
          setStatus(result.state as DeploymentState);
          setUrl(result.url);
          startPolling(input.targetId);
        }
      } catch {
        // Server container may not be available (e.g., in tests)
        log.debug(`mount recovery failed for "${input.targetId}" — ignoring`);
      }
    })();

    return () => {
      cancelled = true;
    };
    // Only run on mount (input identity is stable from the caller)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input?.targetId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

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

        let result;
        try {
          result = await getDeploymentStatus(targetId);
        } catch (err) {
          log.warn(`poll fetch failed for "${targetId}":`, err);
          // Treat fetch failure as deployment gone — clear UI
          if (mountedRef.current) {
            setStatus(null);
            setUrl(null);
            stopPolling();
          }
          return;
        }

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

  // Idle poll — when no deployment is known, periodically check if one was
  // started externally (e.g., from the drawer while the repo node is mounted).
  const IDLE_POLL_INTERVAL = 5000;
  useEffect(() => {
    if (!input || status !== null) return;

    const timer = setInterval(async () => {
      if (!mountedRef.current) return;
      try {
        const result = await getDeploymentStatus(input.targetId);
        if (!mountedRef.current) return;
        if (result && result.state !== 'Stopped') {
          log.info(`idle poll: "${input.targetId}" state=${result.state}, url=${result.url}`);
          setStatus(result.state as DeploymentState);
          setUrl(result.url);
          startPolling(input.targetId);
        }
      } catch {
        // ignore
      }
    }, IDLE_POLL_INTERVAL);

    return () => clearInterval(timer);
  }, [input, status, startPolling]);

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
        log.warn(`deploy failed: ${errorMessage}`);
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
