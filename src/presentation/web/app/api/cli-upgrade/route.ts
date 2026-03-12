import { resolve } from '@/lib/server-container';
import type { UpgradeCliUseCase } from '@shepai/core/application/use-cases/upgrade/upgrade-cli.use-case';

// Force dynamic — SSE streams must never be statically optimized or cached
export const dynamic = 'force-dynamic';

export async function POST(): Promise<Response> {
  const useCase = resolve<UpgradeCliUseCase>('UpgradeCliUseCase');

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const result = await useCase.execute((chunk: string) => {
          controller.enqueue(encoder.encode(`data: ${chunk.replace(/\n/g, '\ndata: ')}\n\n`));
        });
        controller.enqueue(encoder.encode(`event: done\ndata: ${JSON.stringify(result)}\n\n`));

        // If the upgrade succeeded, schedule a daemon self-restart so the
        // new version is loaded automatically — no manual restart needed.
        if (result.status === 'upgraded') {
          controller.enqueue(encoder.encode(`event: restarting\ndata: restarting\n\n`));
          controller.close();
          await useCase.scheduleDaemonRestart();
          return;
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Upgrade failed';
        controller.enqueue(
          encoder.encode(
            `event: done\ndata: ${JSON.stringify({ status: 'error', currentVersion: '', latestVersion: null, errorMessage: message })}\n\n`
          )
        );
      } finally {
        try {
          controller.close();
        } catch {
          // Already closed (e.g. after restart path)
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
