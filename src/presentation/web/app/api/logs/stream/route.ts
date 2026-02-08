import { type NextRequest } from 'next/server';
import { container } from '@/infrastructure/di/container';
import type { ILogRepository } from '@/application/ports/output/log-repository.interface';

/**
 * GET /api/logs/stream - Stream logs via Server-Sent Events (SSE)
 *
 * This endpoint opens a persistent connection and streams new log entries
 * as they are created. Clients can use EventSource to consume the stream.
 *
 * Note: This is a simplified implementation that polls the database.
 * In production, consider using a pub/sub system for true real-time streaming.
 */
export async function GET(request: NextRequest) {
  const encoder = new TextEncoder();

  // Create a ReadableStream for SSE
  const stream = new ReadableStream({
    async start(controller) {
      const logRepository = container.resolve<ILogRepository>('ILogRepository');
      let lastTimestamp = Date.now();
      let isActive = true;

      // Cleanup function
      const cleanup = () => {
        isActive = false;
      };

      // Handle client disconnect
      request.signal.addEventListener('abort', cleanup);

      // Poll for new logs every 1 second
      const pollInterval = setInterval(async () => {
        if (!isActive) {
          clearInterval(pollInterval);
          return;
        }

        try {
          // Fetch logs newer than last timestamp
          const newLogs = await logRepository.search({
            startTime: lastTimestamp,
            limit: 100,
          });

          // Send each new log as an SSE event
          for (const log of newLogs) {
            if (log.timestamp > lastTimestamp) {
              const data = JSON.stringify(log);
              const message = `data: ${data}\n\n`;
              controller.enqueue(encoder.encode(message));
              lastTimestamp = log.timestamp;
            }
          }

          // Send heartbeat to keep connection alive
          if (newLogs.length === 0) {
            const heartbeat = `: heartbeat\n\n`;
            controller.enqueue(encoder.encode(heartbeat));
          }
        } catch (error) {
          // Send error event
          const err = error instanceof Error ? error : new Error(String(error));
          const errorMessage = `event: error\ndata: ${JSON.stringify({ error: 'Stream error', message: err.message })}\n\n`;
          controller.enqueue(encoder.encode(errorMessage));
        }
      }, 1000);

      // Send initial connection message
      const initialMessage = `event: connected\ndata: ${JSON.stringify({ timestamp: Date.now() })}\n\n`;
      controller.enqueue(encoder.encode(initialMessage));
    },
  });

  // Return response with SSE headers
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
