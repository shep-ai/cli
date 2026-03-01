'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { LogEntry } from '@shepai/core/application/ports/output/services/deployment-service.interface';
import { getDeploymentLogs } from '@/app/actions/get-deployment-logs';

export interface UseDeploymentLogsResult {
  logs: LogEntry[];
  isConnected: boolean;
}

export function useDeploymentLogs(targetId: string | null | undefined): UseDeploymentLogsResult {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  const cleanup = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setIsConnected(false);
  }, []);

  useEffect(() => {
    if (!targetId) {
      setLogs([]);
      setIsConnected(false);
      return;
    }

    // Fetch initial logs
    getDeploymentLogs(targetId)
      .then((initialLogs) => {
        if (initialLogs) {
          setLogs(initialLogs);
        }
      })
      .catch(() => {
        // Initial fetch failed — logs stay empty, SSE will still connect
      });

    // Connect EventSource for live updates
    const es = new EventSource(`/api/deployment-logs?targetId=${targetId}`);
    eventSourceRef.current = es;

    es.onopen = () => {
      setIsConnected(true);
    };

    es.addEventListener('log', (event: MessageEvent) => {
      const entry: LogEntry = JSON.parse(event.data);
      setLogs((prev) => [...prev, entry]);
    });

    es.onerror = () => {
      setIsConnected(false);
    };

    return () => {
      es.close();
      eventSourceRef.current = null;
    };
  }, [targetId, cleanup]);

  return { logs, isConnected };
}
