import { NextResponse } from 'next/server';
import { resolve } from '@/lib/server-container';
import type { GetCodeServerStatusUseCase } from '@shepai/core/application/use-cases/code-server/get-code-server-status.use-case';

export async function GET(request: Request): Promise<NextResponse> {
  const url = new URL(request.url);
  const featureId = url.searchParams.get('featureId');

  if (!featureId) {
    return NextResponse.json(
      { error: 'Missing required query parameter: featureId' },
      { status: 400 }
    );
  }

  try {
    const useCase = resolve<GetCodeServerStatusUseCase>('GetCodeServerStatusUseCase');
    const result = await useCase.execute({ featureId });
    return NextResponse.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to get code-server status';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
