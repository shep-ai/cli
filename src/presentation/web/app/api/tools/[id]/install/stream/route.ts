import { resolve } from '@/lib/server-container';
import type { InstallToolUseCase } from '@shepai/core/application/use-cases/tools/install-tool.use-case';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id } = await params;
  const useCase = resolve<InstallToolUseCase>('InstallToolUseCase');

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const status = await useCase.execute(id, (chunk: string) => {
          controller.enqueue(encoder.encode(`data: ${chunk.replace(/\n/g, '\ndata: ')}\n\n`));
        });
        controller.enqueue(encoder.encode(`event: done\ndata: ${JSON.stringify(status)}\n\n`));
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Installation failed';
        controller.enqueue(
          encoder.encode(
            `event: done\ndata: ${JSON.stringify({ status: 'error', toolName: id, errorMessage: message })}\n\n`
          )
        );
      } finally {
        controller.close();
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
