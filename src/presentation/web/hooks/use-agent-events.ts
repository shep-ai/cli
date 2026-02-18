'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { NotificationEvent } from '@shepai/core/domain/generated/output';

export type ConnectionStatus = 'connected' | 'connecting' | 'disconnected';

export interface UseAgentEventsOptions {
  runId?: string;
}

export interface UseAgentEventsResult {
  events: NotificationEvent[];
  lastEvent: NotificationEvent | null;
  connectionStatus: ConnectionStatus;
}

const BASE_BACKOFF_MS = 1000;
const MAX_BACKOFF_MS = 30_000;

export function useAgentEvents(options?: UseAgentEventsOptions): UseAgentEventsResult {
  const [events, setEvents] = useState<NotificationEvent[]>([]);
  const [lastEvent, setLastEvent] = useState<NotificationEvent | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');

  const backoffRef = useRef(BASE_BACKOFF_MS);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const esRef = useRef<EventSource | null>(null);

  const runId = options?.runId;

  const connect = useCallback(() => {
    if (typeof window === 'undefined' || typeof EventSource === 'undefined') {
      return;
    }

    const url = runId
      ? `/api/agent-events?runId=${encodeURIComponent(runId)}`
      : '/api/agent-events';

    const es = new EventSource(url);
    esRef.current = es;
    setConnectionStatus('connecting');

    es.onopen = () => {
      setConnectionStatus('connected');
      backoffRef.current = BASE_BACKOFF_MS;
    };

    es.onerror = () => {
      es.close();
      esRef.current = null;
      setConnectionStatus('disconnected');

      const delay = backoffRef.current;
      backoffRef.current = Math.min(delay * 2, MAX_BACKOFF_MS);

      reconnectTimerRef.current = setTimeout(() => {
        reconnectTimerRef.current = null;
        connect();
      }, delay);
    };

    es.addEventListener('notification', ((event: MessageEvent) => {
      const parsed: NotificationEvent = JSON.parse(event.data);
      setEvents((prev) => [...prev, parsed]);
      setLastEvent(parsed);
    }) as EventListener);
  }, [runId]);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimerRef.current !== null) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      if (esRef.current) {
        esRef.current.close();
        esRef.current = null;
      }
    };
  }, [connect]);

  return { events, lastEvent, connectionStatus };
}
