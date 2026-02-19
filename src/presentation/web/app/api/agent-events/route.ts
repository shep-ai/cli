/**
 * SSE API Route: GET /api/agent-events
 *
 * Streams agent lifecycle notification events to connected web UI clients
 * via Server-Sent Events (SSE). This is the first API route in the web UI.
 *
 * - Subscribes to the notification event bus (shared in-process singleton)
 * - Formats events as SSE data frames (event: notification\ndata: JSON\n\n)
 * - Sends heartbeat comments every 30 seconds to keep connection alive
 * - Supports optional ?runId query parameter to filter events
 * - Cleans up listeners and intervals on client disconnect
 */

import {
  getNotificationBus,
  hasNotificationBus,
} from '@shepai/core/infrastructure/services/notifications/notification-bus';
import type { NotificationEvent } from '@shepai/core/domain/generated/output';

const HEARTBEAT_INTERVAL_MS = 30_000;

function formatSSEEvent(event: NotificationEvent): string {
  return `event: notification\ndata: ${JSON.stringify(event)}\n\n`;
}

function formatHeartbeat(): string {
  return ': heartbeat\n\n';
}

export function GET(request: Request): Response {
  const url = new URL(request.url);
  const runIdFilter = url.searchParams.get('runId');

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const encoder = new TextEncoder();

      let onNotification: ((event: NotificationEvent) => void) | null = null;

      // Subscribe to notification bus if available
      if (hasNotificationBus()) {
        const bus = getNotificationBus();

        onNotification = (event: NotificationEvent) => {
          if (runIdFilter && event.agentRunId !== runIdFilter) {
            return;
          }

          try {
            controller.enqueue(encoder.encode(formatSSEEvent(event)));
          } catch {
            // Stream may be closed — ignore enqueue errors
          }
        };

        bus.on('notification', onNotification);
      }

      // Heartbeat to keep connection alive (even without bus, prevents client reconnect loop)
      const heartbeatInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(formatHeartbeat()));
        } catch {
          // Stream may be closed — ignore enqueue errors
        }
      }, HEARTBEAT_INTERVAL_MS);

      // Cleanup on client disconnect
      const cleanup = () => {
        if (onNotification && hasNotificationBus()) {
          getNotificationBus().removeListener('notification', onNotification);
        }
        clearInterval(heartbeatInterval);
        try {
          controller.close();
        } catch {
          // Stream may already be closed
        }
      };

      request.signal.addEventListener('abort', cleanup, { once: true });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
