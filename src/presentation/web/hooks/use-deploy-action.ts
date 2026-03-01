'use client';
/* eslint-disable no-console */

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

const LOG_PREFIX = '[useDeployAction]';
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
      console.debug(`${LOG_PREFIX} stopping polling`);
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }, []);

  const startPolling = useCallback(
    (targetId: string) => {
      stopPolling();
      console.debug(`${LOG_PREFIX} starting polling for "${targetId}" every ${POLL_INTERVAL}ms`);

      pollIntervalRef.current = setInterval(async () => {
        if (!mountedRef.current) {
          stopPolling();
          return;
        }

        const result = await getDeploymentStatus(targetId);

        if (!mountedRef.current) return;

        if (!result || result.state === 'Stopped') {
          console.info(
            `${LOG_PREFIX} poll result: ${result ? `state=${result.state}` : 'null (deployment gone)'} — stopping poll`
          );
          setStatus(null);
          setUrl(null);
          stopPolling();
        } else {
          if (result.state !== status) {
            console.info(
              `${LOG_PREFIX} poll state changed: ${status} → ${result.state}, url=${result.url}`
            );
          }
          setStatus(result.state as DeploymentState);
          setUrl(result.url);
        }
      }, POLL_INTERVAL);
    },
    [stopPolling, status]
  );

  const handleDeploy = useCallback(async () => {
    if (!input) {
      console.warn(`${LOG_PREFIX} deploy() called but input is null — no-op`);
      return;
    }
    if (deployLoading) {
      console.warn(`${LOG_PREFIX} deploy() called but already loading — no-op`);
      return;
    }

    console.info(
      `${LOG_PREFIX} deploy() — targetType="${input.targetType}", targetId="${input.targetId}", repositoryPath="${input.repositoryPath}"`
    );

    if (errorTimerRef.current) clearTimeout(errorTimerRef.current);

    setDeployLoading(true);
    setDeployError(null);

    try {
      const result =
        input.targetType === 'feature'
          ? await deployFeature(input.targetId)
          : await deployRepository(input.repositoryPath);

      console.info(`${LOG_PREFIX} server action result:`, result);

      if (!mountedRef.current) {
        console.warn(`${LOG_PREFIX} component unmounted after deploy — discarding result`);
        return;
      }

      if (!result.success) {
        const errorMessage = result.error ?? 'An unexpected error occurred';
        console.error(`${LOG_PREFIX} deploy failed: ${errorMessage}`);
        setDeployError(errorMessage);
        errorTimerRef.current = setTimeout(() => setDeployError(null), ERROR_CLEAR_DELAY);
      } else {
        console.info(
          `${LOG_PREFIX} deploy succeeded — initial state=${result.state}, starting polling`
        );
        setStatus(result.state ?? null);
        setUrl(null);
        startPolling(input.targetId);
      }
    } catch (err: unknown) {
      if (!mountedRef.current) return;
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      console.error(`${LOG_PREFIX} deploy threw exception: ${errorMessage}`, err);
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

    console.info(`${LOG_PREFIX} stop() — targetId="${input.targetId}"`);
    setStopLoading(true);

    try {
      const result = await stopDeployment(input.targetId);
      console.info(`${LOG_PREFIX} stop result:`, result);

      if (!mountedRef.current) return;

      if (result.success) {
        stopPolling();
        setStatus(null);
        setUrl(null);
      }
    } catch (err) {
      console.warn(`${LOG_PREFIX} stop error (non-critical):`, err);
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
