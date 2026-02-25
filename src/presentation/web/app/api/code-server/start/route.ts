import { NextResponse } from 'next/server';
import { resolve } from '@/lib/server-container';
import type { StartCodeServerUseCase } from '@shepai/core/application/use-cases/code-server/start-code-server.use-case';

export async function POST(request: Request): Promise<NextResponse> {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { featureId, repositoryPath, branch } = body;

  if (!featureId || typeof featureId !== 'string') {
    return NextResponse.json({ error: 'Missing required field: featureId' }, { status: 400 });
  }
  if (!repositoryPath || typeof repositoryPath !== 'string') {
    return NextResponse.json({ error: 'Missing required field: repositoryPath' }, { status: 400 });
  }
  if (!branch || typeof branch !== 'string') {
    return NextResponse.json({ error: 'Missing required field: branch' }, { status: 400 });
  }

  try {
    const useCase = resolve<StartCodeServerUseCase>('StartCodeServerUseCase');
    const result = await useCase.execute({ featureId, repositoryPath, branch });
    return NextResponse.json({ url: result.url, port: result.port });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to start code-server';

    if (message.includes('Feature not found')) {
      return NextResponse.json({ error: message }, { status: 404 });
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
