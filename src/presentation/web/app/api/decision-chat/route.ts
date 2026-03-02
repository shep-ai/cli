/**
 * POST /api/decision-chat
 *
 * Streams agent responses for the decision review chat. Accepts conversation
 * history and review context, constructs a system prompt, resolves the agent
 * executor via DI, and pipes AgentExecutionStreamEvent objects as
 * newline-delimited JSON over a ReadableStream.
 */

import { resolve } from '@/lib/server-container';
import type { IAgentExecutorProvider } from '@shepai/core/application/ports/output/agents/agent-executor-provider.interface';

export const dynamic = 'force-dynamic';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface DecisionChatRequestBody {
  featureId: string;
  reviewType: 'tech' | 'prd';
  reviewContext: Record<string, unknown>;
  messages: ChatMessage[];
}

function buildSystemPrompt(reviewType: string, reviewContext: Record<string, unknown>): string {
  const isProduct = reviewType === 'prd';
  const role = isProduct
    ? 'product requirements review assistant'
    : 'technical decisions review assistant';

  const contextLabel = isProduct ? 'product decisions' : 'technical decisions';

  return [
    `You are a ${role}. You are helping a user review and discuss ${contextLabel} for a software feature.`,
    '',
    'Your role is to:',
    '- Answer questions about why specific decisions were made',
    '- Explain the rationale behind chosen options and rejected alternatives',
    '- Help the user think through trade-offs and implications',
    '- Reference specific decisions from the context when relevant',
    '- Be concise and focused on the review context',
    '',
    '## Feature Context',
    '',
    JSON.stringify(reviewContext, null, 2),
  ].join('\n');
}

function buildPrompt(messages: ChatMessage[]): string {
  return messages
    .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
    .join('\n\n');
}

export async function POST(request: Request): Promise<Response> {
  let body: DecisionChatRequestBody;

  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { featureId, reviewType, reviewContext, messages } = body;

  if (!featureId?.trim()) {
    return new Response(JSON.stringify({ error: 'featureId is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!Array.isArray(messages) || messages.length === 0) {
    return new Response(JSON.stringify({ error: 'messages must be a non-empty array' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const provider = resolve<IAgentExecutorProvider>('IAgentExecutorProvider');
    const executor = provider.getExecutor();

    const systemPrompt = buildSystemPrompt(reviewType, reviewContext);
    const prompt = buildPrompt(messages);

    const eventStream = executor.executeStream(prompt, { systemPrompt });

    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          for await (const event of eventStream) {
            const chunk = JSON.stringify({
              type: event.type,
              content: event.content,
              timestamp: event.timestamp,
            });
            controller.enqueue(encoder.encode(`${chunk}\n`));
          }
        } catch (err) {
          const errorChunk = JSON.stringify({
            type: 'error',
            content: err instanceof Error ? err.message : 'Unknown streaming error',
            timestamp: new Date(),
          });
          controller.enqueue(encoder.encode(`${errorChunk}\n`));
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
