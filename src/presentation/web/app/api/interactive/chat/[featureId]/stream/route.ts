/**
 * Feature-scoped SSE stream for real-time chat updates.
 *
 * Resolves the active session for the feature internally.
 * Emits:
 *   - `delta` events with token chunks
 *   - `log` events for tool use / thinking
 *   - `done` events at end-of-turn
 *
 * `featureId` is a polymorphic scope key: a feature UUID, "repo-<id>", or "global".
 */

import type { NextRequest } from 'next/server';
import { resolve } from '@/lib/server-container';
import type { IInteractiveSessionService } from '@shepai/core/application/ports/output/services/interactive-session-service.interface';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ featureId: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams): Promise<Response> {
  const { featureId } = await params;

  try {
    // SSE streams use service directly for subscribe pattern
    const service = resolve<IInteractiveSessionService>('IInteractiveSessionService');
    const encoder = new TextEncoder();

    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        let closed = false;

        function enqueue(text: string) {
          if (closed) return;
          try {
            controller.enqueue(encoder.encode(text));
          } catch {
            // Stream may already be closed
          }
        }

        enqueue(': connected\n\n');

        const heartbeat = setInterval(() => {
          enqueue(': heartbeat\n\n');
        }, 15_000);

        const unsubscribe = service.subscribeByFeature(featureId, (chunk) => {
          if (chunk.done) {
            enqueue(`event: done\ndata: ${JSON.stringify({ done: true, featureId })}\n\n`);
          } else if (chunk.activity) {
            enqueue(
              `event: activity\ndata: ${JSON.stringify({ activity: chunk.activity, featureId })}\n\n`
            );
            // Also send log for the status indicator
            if (chunk.log) {
              enqueue(`event: log\ndata: ${JSON.stringify({ log: chunk.log, featureId })}\n\n`);
            }
          } else if (chunk.log) {
            enqueue(`event: log\ndata: ${JSON.stringify({ log: chunk.log, featureId })}\n\n`);
          } else if (chunk.delta) {
            enqueue(`event: delta\ndata: ${JSON.stringify({ delta: chunk.delta, featureId })}\n\n`);
          }
        });

        function cleanup() {
          if (closed) return;
          closed = true;
          clearInterval(heartbeat);
          unsubscribe();
          try {
            controller.close();
          } catch {
            // Stream may already be closed
          }
        }

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
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[GET /api/interactive/chat/:featureId/stream]', error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
