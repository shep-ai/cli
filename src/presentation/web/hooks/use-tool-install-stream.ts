'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import type { ToolInstallationStatus } from '@shepai/core/domain/generated/output';

export type InstallStreamStatus = 'idle' | 'streaming' | 'done' | 'error';

export interface UseToolInstallStreamResult {
  logs: string[];
  status: InstallStreamStatus;
  result: ToolInstallationStatus | null;
  startInstall: () => void;
}

export function useToolInstallStream(toolId: string): UseToolInstallStreamResult {
  const [logs, setLogs] = useState<string[]>([]);
  const [status, setStatus] = useState<InstallStreamStatus>('idle');
  const [result, setResult] = useState<ToolInstallationStatus | null>(null);
  const esRef = useRef<EventSource | null>(null);

  const cleanup = useCallback(() => {
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => cleanup, [cleanup]);

  const startInstall = useCallback(() => {
    cleanup();
    setLogs([]);
    setResult(null);
    setStatus('streaming');

    const es = new EventSource(`/api/tools/${toolId}/install/stream`);
    esRef.current = es;

    es.onmessage = (event: MessageEvent) => {
      setLogs((prev) => [...prev, event.data]);
    };

    es.addEventListener('done', (event: MessageEvent) => {
      const installResult: ToolInstallationStatus = JSON.parse(event.data);
      setResult(installResult);
      setStatus(installResult.status === 'error' ? 'error' : 'done');
      cleanup();
    });

    es.onerror = () => {
      setStatus('error');
      cleanup();
    };
  }, [toolId, cleanup]);

  return { logs, status, result, startInstall };
}
