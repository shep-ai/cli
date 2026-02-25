import { NextResponse } from 'next/server';
import { resolve } from '@/lib/server-container';
import type { StopCodeServerUseCase } from '@shepai/core/application/use-cases/code-server/stop-code-server.use-case';

export async function POST(request: Request): Promise<NextResponse> {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { featureId } = body;

  if (!featureId || typeof featureId !== 'string') {
    return NextResponse.json({ error: 'Missing required field: featureId' }, { status: 400 });
  }

  try {
    const useCase = resolve<StopCodeServerUseCase>('StopCodeServerUseCase');
    await useCase.execute({ featureId });
    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to stop code-server';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
