/**
 * SSE API Route: POST /api/chat/stream
 *
 * Streams chat responses from the configured AI agent via Server-Sent Events.
 *
 * Request body: { message: string, sessionId?: string }
 * Response: SSE stream with events:
 *   - data: { type: 'progress', content: string }
 *   - data: { type: 'result', content: string, sessionId?: string }
 *   - data: { type: 'error', content: string }
 */

import { resolve } from '@/lib/server-container';
import type { IAgentExecutorProvider } from '@shepai/core/application/ports/output/agents/agent-executor-provider.interface';
import { AgentFeature } from '@shepai/core/domain/generated/output';

export const dynamic = 'force-dynamic';

const MAX_MESSAGE_LENGTH = 10_000;
const HEARTBEAT_INTERVAL_MS = 30_000;

const SYSTEM_PROMPT = `You are Shep, an AI assistant for software development. You help users with their projects by answering questions, explaining code, suggesting improvements, and assisting with development tasks. Be concise, helpful, and technical when appropriate.`;

interface ChatStreamRequest {
  message: string;
  sessionId?: string | null;
}

function validateRequest(
  body: unknown
): { valid: true; data: ChatStreamRequest } | { valid: false; error: string } {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Request body must be a JSON object' };
  }

  const { message, sessionId } = body as Record<string, unknown>;

  if (typeof message !== 'string' || message.trim().length === 0) {
    return { valid: false, error: 'message is required and must be a non-empty string' };
  }

  if (message.length > MAX_MESSAGE_LENGTH) {
    return { valid: false, error: `message must be ${MAX_MESSAGE_LENGTH} characters or fewer` };
  }

  if (sessionId !== undefined && sessionId !== null && typeof sessionId !== 'string') {
    return { valid: false, error: 'sessionId must be a string if provided' };
  }

  return {
    valid: true,
    data: { message: message.trim(), sessionId: sessionId as string | undefined | null },
  };
}

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response('Invalid JSON in request body', { status: 400 });
  }

  const validation = validateRequest(body);
  if (!validation.valid) {
    return new Response(validation.error, { status: 400 });
  }

  const { message, sessionId } = validation.data;

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let heartbeatInterval: ReturnType<typeof setInterval> | null = null;
      let stopped = false;

      function enqueue(data: string) {
        if (stopped) return;
        try {
          controller.enqueue(encoder.encode(data));
        } catch {
          stopped = true;
        }
      }

      function sendEvent(event: { type: string; content: string; sessionId?: string }) {
        enqueue(`data: ${JSON.stringify(event)}\n\n`);
      }

      function cleanup() {
        stopped = true;
        if (heartbeatInterval) {
          clearInterval(heartbeatInterval);
          heartbeatInterval = null;
        }
      }

      // Heartbeat to keep connection alive
      heartbeatInterval = setInterval(() => {
        enqueue(': heartbeat\n\n');
      }, HEARTBEAT_INTERVAL_MS);

      // Clean up on client disconnect
      request.signal.addEventListener(
        'abort',
        () => {
          cleanup();
          try {
            controller.close();
          } catch {
            // Already closed
          }
        },
        { once: true }
      );

      try {
        const provider = resolve<IAgentExecutorProvider>('IAgentExecutorProvider');
        const executor = await provider.getExecutor();

        const options = {
          systemPrompt: SYSTEM_PROMPT,
          resumeSession: sessionId ?? undefined,
          silent: true,
        };

        if (executor.supportsFeature(AgentFeature.streaming)) {
          // Streaming path — forward each event as SSE
          for await (const event of executor.executeStream(message, options)) {
            if (stopped) break;

            switch (event.type) {
              case 'progress':
                sendEvent({ type: 'progress', content: event.content });
                break;
              case 'result':
                sendEvent({
                  type: 'result',
                  content: event.content,
                  // sessionId may be attached as extra property by executor implementations
                  sessionId:
                    'sessionId' in event
                      ? String((event as unknown as { sessionId: string }).sessionId)
                      : undefined,
                });
                break;
              case 'error':
                sendEvent({ type: 'error', content: event.content });
                break;
            }
          }

          // If no result event was emitted, send a completion event
          // (the stream may end naturally after progress events)
        } else {
          // Non-streaming fallback — execute() and simulate streaming
          const result = await executor.execute(message, options);
          sendEvent({ type: 'progress', content: result.result });
          sendEvent({ type: 'result', content: '', sessionId: result.sessionId });
        }
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
        sendEvent({ type: 'error', content: errorMessage });
      } finally {
        cleanup();
        try {
          controller.close();
        } catch {
          // Already closed
        }
      }
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
