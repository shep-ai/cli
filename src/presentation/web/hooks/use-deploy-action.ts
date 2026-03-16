'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { createLogger } from '@/lib/logger';
import type { DeploymentState, DevEnvironmentAnalysis } from '@shepai/core/domain/generated/output';
import type { AnalysisMode } from '@shepai/core/application/ports/output/services/dev-environment-analyzer.interface';
import { deployFeature } from '@/app/actions/deploy-feature';
import { deployRepository } from '@/app/actions/deploy-repository';
import { stopDeployment } from '@/app/actions/stop-deployment';
import { getDeploymentStatus } from '@/app/actions/get-deployment-status';
import { analyzeRepository } from '@/app/actions/analyze-repository';
import { invalidateDevEnvCache } from '@/app/actions/invalidate-dev-env-cache';

export interface DeployActionInput {
  targetId: string;
  targetType: 'feature' | 'repository';
  repositoryPath: string;
  branch?: string;
}

/** Summary of a cached analysis for UI display. */
export interface AnalysisSummary {
  canStart: boolean;
  reason?: string;
  language: string;
  framework?: string;
  commandCount: number;
  ports?: number[];
  source: string;
}

export interface DeployActionState {
  deploy: () => Promise<void>;
  stop: () => Promise<void>;
  deployLoading: boolean;
  stopLoading: boolean;
  deployError: string | null;
  status: DeploymentState | null;
  url: string | null;
  /** Current analysis mode: "fast", "agent", or null if not yet determined. */
  mode: AnalysisMode | null;
  /** Set the analysis mode. */
  setMode: (mode: AnalysisMode) => void;
  /** Summary of cached analysis, or null if no cache exists. */
  analysisSummary: AnalysisSummary | null;
  /** Whether an analysis is currently in progress. */
  analyzing: boolean;
  /** Invalidate cache and re-run analysis. */
  reAnalyze: () => Promise<void>;
}

const log = createLogger('[useDeployAction]');

const ERROR_CLEAR_DELAY = 5000;
const POLL_INTERVAL = 3000;

function toSummary(analysis: DevEnvironmentAnalysis): AnalysisSummary {
  return {
    canStart: analysis.canStart,
    reason: analysis.reason,
    language: analysis.language,
    framework: analysis.framework,
    commandCount: analysis.commands?.length ?? 0,
    ports: analysis.ports,
    source: analysis.source,
  };
}

export function useDeployAction(input: DeployActionInput | null): DeployActionState {
  const [deployLoading, setDeployLoading] = useState(false);
  const [stopLoading, setStopLoading] = useState(false);
  const [deployError, setDeployError] = useState<string | null>(null);
  const [status, setStatus] = useState<DeploymentState | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [analysisMode, setAnalysisMode] = useState<AnalysisMode | null>(null);
  const [analysisSummary, setAnalysisSummary] = useState<AnalysisSummary | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

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

  // Load cached analysis on mount (and when repositoryPath changes)
  useEffect(() => {
    if (!input?.repositoryPath) return;

    let cancelled = false;

    async function loadCachedAnalysis() {
      try {
        const result = await analyzeRepository(input!.repositoryPath);
        if (cancelled || !mountedRef.current) return;

        if (result.success) {
          setAnalysisSummary(toSummary(result.analysis));
          // Auto-detect mode from cached analysis source
          if (result.analysis.source === 'FastPath') {
            setAnalysisMode('fast');
          } else if (result.analysis.source === 'Agent') {
            setAnalysisMode('agent');
          }
          // If cached analysis says not startable, set NotStartable status
          if (!result.analysis.canStart) {
            setStatus('NotStartable' as DeploymentState);
          }
        }
      } catch {
        // Non-critical: analysis cache load failed silently
        log.debug('failed to load cached analysis on mount');
      }
    }

    loadCachedAnalysis();

    return () => {
      cancelled = true;
    };
  }, [input]);

  const setMode = useCallback((newMode: AnalysisMode) => {
    log.info(`mode changed to "${newMode}"`);
    setAnalysisMode(newMode);
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

        const result = await getDeploymentStatus(targetId);

        if (!mountedRef.current) return;

        if (!result || result.state === 'Stopped') {
          log.info(
            `poll result: ${result ? `state=${result.state}` : 'null (deployment gone)'} — stopping poll`
          );
          setStatus(null);
          setUrl(null);
          stopPolling();
        } else if (result.state === 'NotStartable') {
          log.info('poll result: NotStartable — stopping poll');
          setStatus(result.state as DeploymentState);
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
      // Run analysis first if we have a mode selected
      if (analysisMode) {
        setAnalyzing(true);
        const analysisResult = await analyzeRepository(input.repositoryPath, analysisMode);
        if (mountedRef.current) {
          setAnalyzing(false);
          if (analysisResult.success) {
            setAnalysisSummary(toSummary(analysisResult.analysis));
            if (!analysisResult.analysis.canStart) {
              log.info('analysis says not startable — setting NotStartable');
              setStatus('NotStartable' as DeploymentState);
              setDeployLoading(false);
              return;
            }
          }
        }
      }

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
      } else if (result.state === ('NotStartable' as DeploymentState)) {
        log.info('deploy returned NotStartable — no polling needed');
        setStatus('NotStartable' as DeploymentState);
        setUrl(null);
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
        setAnalyzing(false);
      }
    }
  }, [input, deployLoading, startPolling, analysisMode]);

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

  const handleReAnalyze = useCallback(async () => {
    if (!input?.repositoryPath) return;

    log.info(`reAnalyze() — repositoryPath="${input.repositoryPath}"`);
    setAnalyzing(true);

    try {
      // Invalidate existing cache
      await invalidateDevEnvCache(input.repositoryPath);

      if (!mountedRef.current) return;

      // Re-run analysis
      const result = await analyzeRepository(input.repositoryPath, analysisMode ?? undefined);

      if (!mountedRef.current) return;

      if (result.success) {
        setAnalysisSummary(toSummary(result.analysis));
        if (!result.analysis.canStart) {
          setStatus('NotStartable' as DeploymentState);
        } else {
          // Clear NotStartable status if re-analysis says it's now startable
          if (statusRef.current === ('NotStartable' as DeploymentState)) {
            setStatus(null);
          }
        }
      }
    } catch (err) {
      log.warn('reAnalyze error:', err);
    } finally {
      if (mountedRef.current) {
        setAnalyzing(false);
      }
    }
  }, [input?.repositoryPath, analysisMode]);

  return {
    deploy: handleDeploy,
    stop: handleStop,
    deployLoading,
    stopLoading,
    deployError,
    status,
    url,
    mode: analysisMode,
    setMode,
    analysisSummary,
    analyzing,
    reAnalyze: handleReAnalyze,
  };
}
