import { NextResponse } from 'next/server';
import { resolve } from '@/lib/server-container';
import type { ListToolsUseCase } from '@shepai/core/application/use-cases/tools/list-tools.use-case';

export async function GET(): Promise<NextResponse> {
  try {
    const useCase = resolve<ListToolsUseCase>('ListToolsUseCase');
    const tools = await useCase.execute();
    return NextResponse.json(tools);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to list tools';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
