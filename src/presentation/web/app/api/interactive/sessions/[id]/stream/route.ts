/**
 * GET /api/interactive/sessions/[id]/stream
 *
 * Per-session SSE stream delivering real-time agent stdout chunks to the browser.
 * - Subscribes to InteractiveSessionService stdout events
 * - Emits `delta` events with each token chunk
 * - Emits `done` events at end-of-turn
 * - Cleans up listener when the client disconnects
 */

import type { NextRequest } from 'next/server';
import { resolve } from '@/lib/server-container';
import type { IInteractiveSessionService } from '@shepai/core/application/ports/output/services/interactive-session-service.interface';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams): Promise<Response> {
  const { id: sessionId } = await params;

  try {
    const service = resolve<IInteractiveSessionService>('IInteractiveSessionService');

    // Verify session exists
    const session = await service.getSession(sessionId);
    if (!session) {
      return new Response(JSON.stringify({ error: 'Session not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

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

        // Send initial comment so the browser knows the stream is alive
        enqueue(': connected\n\n');

        // Keep-alive heartbeat every 15s to prevent browser/proxy timeouts
        const heartbeat = setInterval(() => {
          enqueue(': heartbeat\n\n');
        }, 15_000);

        // Subscribe to real-time stdout chunks from the session service
        const unsubscribe = service.subscribe(sessionId, (chunk) => {
          if (chunk.done) {
            const payload = { done: true, sessionId };
            enqueue(`event: done\ndata: ${JSON.stringify(payload)}\n\n`);
          } else if (chunk.log) {
            const payload = { log: chunk.log, sessionId };
            enqueue(`event: log\ndata: ${JSON.stringify(payload)}\n\n`);
          } else if (chunk.delta) {
            const payload = { delta: chunk.delta, sessionId };
            enqueue(`event: delta\ndata: ${JSON.stringify(payload)}\n\n`);
          }
        });

        // Cleanup on client disconnect
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
    console.error('[GET /api/interactive/sessions/:id/stream]', error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
