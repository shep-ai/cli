'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { LogEntry } from '@/domain/generated/output';

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

export interface UseLogStreamResult {
  logs: LogEntry[];
  connectionStatus: ConnectionStatus;
  isPaused: boolean;
  pause: () => void;
  resume: () => void;
  clear: () => void;
}

const MAX_BUFFER_SIZE = 1000; // Maximum number of logs to keep in memory

export function useLogStream(): UseLogStreamResult {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting');
  const [isPaused, setIsPaused] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const pausedBufferRef = useRef<LogEntry[]>([]);

  const addLog = useCallback(
    (log: LogEntry) => {
      if (isPaused) {
        // Buffer logs while paused
        pausedBufferRef.current.push(log);
        // Limit buffer size
        if (pausedBufferRef.current.length > MAX_BUFFER_SIZE) {
          pausedBufferRef.current.shift();
        }
      } else {
        setLogs((prevLogs) => {
          const newLogs = [...prevLogs, log];
          // Limit total logs in memory
          if (newLogs.length > MAX_BUFFER_SIZE) {
            return newLogs.slice(-MAX_BUFFER_SIZE);
          }
          return newLogs;
        });
      }
    },
    [isPaused]
  );

  const pause = useCallback(() => {
    setIsPaused(true);
  }, []);

  const resume = useCallback(() => {
    setIsPaused(false);
    // Add buffered logs
    if (pausedBufferRef.current.length > 0) {
      setLogs((prevLogs) => {
        const newLogs = [...prevLogs, ...pausedBufferRef.current];
        pausedBufferRef.current = [];
        // Limit total logs
        if (newLogs.length > MAX_BUFFER_SIZE) {
          return newLogs.slice(-MAX_BUFFER_SIZE);
        }
        return newLogs;
      });
    }
  }, []);

  const clear = useCallback(() => {
    setLogs([]);
    pausedBufferRef.current = [];
  }, []);

  useEffect(() => {
    // Create EventSource connection
    const eventSource = new EventSource('/api/logs/stream');
    eventSourceRef.current = eventSource;

    // Handle connection open
    eventSource.addEventListener('open', () => {
      setConnectionStatus('connecting');
    });

    // Handle connected event
    eventSource.addEventListener('connected', () => {
      setConnectionStatus('connected');
    });

    // Handle message (new log entry)
    eventSource.addEventListener('message', (event) => {
      try {
        const log: LogEntry = JSON.parse(event.data);
        addLog(log);
      } catch (error) {
        // Silently ignore parse errors - logged on server
      }
    });

    // Handle error
    eventSource.addEventListener('error', (_event) => {
      setConnectionStatus('error');

      // Attempt reconnection after delay
      setTimeout(() => {
        if (eventSourceRef.current?.readyState === EventSource.CLOSED) {
          setConnectionStatus('connecting');
        }
      }, 3000);
    });

    // Cleanup on unmount
    return () => {
      eventSource.close();
      eventSourceRef.current = null;
      setConnectionStatus('disconnected');
    };
  }, [addLog]);

  return {
    logs,
    connectionStatus,
    isPaused,
    pause,
    resume,
    clear,
  };
}
