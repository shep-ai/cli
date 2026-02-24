/**
 * Service Worker: agent-events-sw.js
 *
 * Maintains a single SSE connection to /api/agent-events and broadcasts
 * NotificationEvent deltas to all connected tabs via postMessage.
 *
 * Messages FROM clients:
 *   { type: 'subscribe', runId?: string }  — register this tab
 *   { type: 'unsubscribe' }                — unregister this tab
 *
 * Messages TO clients:
 *   { type: 'notification', data: NotificationEvent }
 *   { type: 'status', status: 'connected' | 'connecting' | 'disconnected' }
 */

/* global self, EventSource, setTimeout, clearTimeout */

const BASE_BACKOFF_MS = 1000;
const MAX_BACKOFF_MS = 30_000;
const STABLE_CONNECTION_MS = 5_000;

/** @type {EventSource | null} */
let eventSource = null;
/** @type {string | undefined} */
let currentRunId;
let backoff = BASE_BACKOFF_MS;
/** @type {ReturnType<typeof setTimeout> | null} */
let reconnectTimer = null;
/** @type {ReturnType<typeof setTimeout> | null} */
let stableTimer = null;
/** @type {'connected' | 'connecting' | 'disconnected'} */
let connectionStatus = 'disconnected';
let subscriberCount = 0;

// --- Lifecycle ---

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// --- Client messaging ---

self.addEventListener('message', (event) => {
  const { type, runId } = event.data ?? {};

  if (type === 'subscribe') {
    subscriberCount++;
    currentRunId = runId;

    // Send current status to the new subscriber immediately
    event.source?.postMessage({ type: 'status', status: connectionStatus });

    // Start connection if this is the first subscriber
    if (subscriberCount === 1) {
      connect();
    }
  } else if (type === 'unsubscribe') {
    subscriberCount = Math.max(0, subscriberCount - 1);

    // Close connection when no subscribers remain
    if (subscriberCount === 0) {
      disconnect();
    }
  }
});

// --- SSE connection management ---

function connect() {
  if (eventSource) return;

  const url = currentRunId
    ? `/api/agent-events?runId=${encodeURIComponent(currentRunId)}`
    : '/api/agent-events';

  eventSource = new EventSource(url);
  setStatus('connecting');

  eventSource.onopen = () => {
    setStatus('connected');
    // Only reset backoff after connection is stable
    stableTimer = setTimeout(() => {
      stableTimer = null;
      backoff = BASE_BACKOFF_MS;
    }, STABLE_CONNECTION_MS);
  };

  eventSource.onerror = () => {
    cleanup();
    setStatus('disconnected');

    // Don't reconnect if no subscribers
    if (subscriberCount <= 0) return;

    const delay = backoff;
    backoff = Math.min(delay * 2, MAX_BACKOFF_MS);

    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      connect();
    }, delay);
  };

  eventSource.addEventListener('notification', (event) => {
    /** @type {unknown} */
    let data;
    try {
      data = JSON.parse(event.data);
    } catch {
      return;
    }
    broadcast({ type: 'notification', data });
  });
}

function disconnect() {
  if (reconnectTimer !== null) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  cleanup();
  backoff = BASE_BACKOFF_MS;
  setStatus('disconnected');
}

function cleanup() {
  if (stableTimer !== null) {
    clearTimeout(stableTimer);
    stableTimer = null;
  }
  if (eventSource) {
    eventSource.close();
    eventSource = null;
  }
}

// --- Helpers ---

function setStatus(status) {
  connectionStatus = status;
  broadcast({ type: 'status', status });
}

async function broadcast(message) {
  const clients = await self.clients.matchAll({ type: 'window' });
  for (const client of clients) {
    client.postMessage(message);
  }
}
