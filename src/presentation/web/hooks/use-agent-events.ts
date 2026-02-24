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

const SW_PATH = '/agent-events-sw.js';

/**
 * Hook that receives real-time agent notification events via a Service Worker.
 *
 * The SW maintains a single SSE connection to /api/agent-events and
 * broadcasts events to all open tabs. Falls back to direct EventSource
 * when Service Workers are unavailable.
 */
export function useAgentEvents(options?: UseAgentEventsOptions): UseAgentEventsResult {
  const [events, setEvents] = useState<NotificationEvent[]>([]);
  const [lastEvent, setLastEvent] = useState<NotificationEvent | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');

  const runId = options?.runId;
  const swRef = useRef<ServiceWorker | null>(null);

  const onMessage = useCallback((event: MessageEvent) => {
    const msg = event.data;
    if (!msg || typeof msg !== 'object') return;

    if (msg.type === 'notification') {
      const parsed = msg.data as NotificationEvent;
      setEvents((prev) => [...prev, parsed]);
      setLastEvent(parsed);
    } else if (msg.type === 'status') {
      setConnectionStatus(msg.status as ConnectionStatus);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Fallback: direct EventSource when SW not supported
    if (!navigator.serviceWorker) {
      return connectDirectEventSource(runId, setEvents, setLastEvent, setConnectionStatus);
    }

    let cancelled = false;

    navigator.serviceWorker
      .register(SW_PATH, { scope: '/' })
      .then((registration) => {
        if (cancelled) return;

        // Use the active worker, or wait for it to activate
        const sw = registration.active ?? registration.installing ?? registration.waiting;
        if (!sw) return;

        function activate(worker: ServiceWorker) {
          if (cancelled) return;
          swRef.current = worker;
          navigator.serviceWorker.addEventListener('message', onMessage);
          worker.postMessage({ type: 'subscribe', runId });
          setConnectionStatus('connecting');
        }

        if (sw.state === 'activated') {
          activate(sw);
        } else {
          sw.addEventListener('statechange', () => {
            if (sw.state === 'activated') activate(sw);
          });
        }
      })
      .catch(() => {
        // SW registration failed — fall back to direct EventSource
        if (!cancelled) {
          const cleanup = connectDirectEventSource(
            runId,
            setEvents,
            setLastEvent,
            setConnectionStatus
          );
          // Store cleanup for when effect tears down
          fallbackCleanupRef.current = cleanup;
        }
      });

    const fallbackCleanupRef = { current: undefined as (() => void) | undefined };

    return () => {
      cancelled = true;
      navigator.serviceWorker.removeEventListener('message', onMessage);
      swRef.current?.postMessage({ type: 'unsubscribe' });
      swRef.current = null;
      fallbackCleanupRef.current?.();
    };
  }, [runId, onMessage]);

  return { events, lastEvent, connectionStatus };
}

// --- EventSource fallback (identical to the previous implementation) ---

const BASE_BACKOFF_MS = 1000;
const MAX_BACKOFF_MS = 30_000;
const STABLE_CONNECTION_MS = 5_000;

function connectDirectEventSource(
  runId: string | undefined,
  setEvents: React.Dispatch<React.SetStateAction<NotificationEvent[]>>,
  setLastEvent: React.Dispatch<React.SetStateAction<NotificationEvent | null>>,
  setConnectionStatus: React.Dispatch<React.SetStateAction<ConnectionStatus>>
): () => void {
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  if (typeof EventSource === 'undefined') return () => {};

  let es: EventSource | null = null;
  let stopped = false;
  let backoff = BASE_BACKOFF_MS;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let stableTimer: ReturnType<typeof setTimeout> | null = null;

  function connect() {
    if (stopped) return;

    const url = runId
      ? `/api/agent-events?runId=${encodeURIComponent(runId)}`
      : '/api/agent-events';

    es = new EventSource(url);
    setConnectionStatus('connecting');

    es.onopen = () => {
      setConnectionStatus('connected');
      stableTimer = setTimeout(() => {
        stableTimer = null;
        backoff = BASE_BACKOFF_MS;
      }, STABLE_CONNECTION_MS);
    };

    es.onerror = () => {
      es?.close();
      es = null;
      setConnectionStatus('disconnected');

      if (stableTimer !== null) {
        clearTimeout(stableTimer);
        stableTimer = null;
      }

      const delay = backoff;
      backoff = Math.min(delay * 2, MAX_BACKOFF_MS);

      reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        connect();
      }, delay);
    };

    es.addEventListener('notification', ((event: MessageEvent) => {
      const parsed: NotificationEvent = JSON.parse(event.data);
      setEvents((prev) => [...prev, parsed]);
      setLastEvent(parsed);
    }) as EventListener);
  }

  connect();

  return () => {
    stopped = true;
    if (reconnectTimer !== null) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    if (stableTimer !== null) {
      clearTimeout(stableTimer);
      stableTimer = null;
    }
    if (es) {
      es.close();
      es = null;
    }
  };
}
