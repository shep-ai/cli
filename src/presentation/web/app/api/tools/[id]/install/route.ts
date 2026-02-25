import { NextResponse } from 'next/server';
import { resolve } from '@/lib/server-container';
import type { InstallToolUseCase } from '@shepai/core/application/use-cases/tools/install-tool.use-case';
import { TOOL_METADATA } from '@shepai/core/infrastructure/services/tool-installer/tool-metadata';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;

  if (!TOOL_METADATA[id]) {
    return NextResponse.json({ error: 'Tool not found' }, { status: 404 });
  }

  try {
    const useCase = resolve<InstallToolUseCase>('InstallToolUseCase');
    const status = await useCase.execute(id);
    return NextResponse.json({ status });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to install tool';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
