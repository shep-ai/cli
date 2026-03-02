import { NextResponse } from 'next/server';
import { resolve } from '@/lib/server-container';
import type { InstallToolUseCase } from '@shepai/core/application/use-cases/tools/install-tool.use-case';
import type { ToolInstallationStatus } from '@shepai/core/domain/generated/output';

// NOTE: Do NOT import TOOL_METADATA directly in API routes.
// The module uses import.meta.url + fs.readdirSync to load JSON files,
// which breaks when Turbopack bundles it (import.meta.url resolves to
// the bundled chunk location where the tools/ directory doesn't exist).
// Tool validation is delegated to the use case via the DI container,
// where the module loads correctly in the Node.js CLI bootstrap context.

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;

  try {
    const useCase = resolve<InstallToolUseCase>('InstallToolUseCase');
    const status: ToolInstallationStatus = await useCase.execute(id);

    if (status.status === 'error') {
      return NextResponse.json({ error: status.errorMessage }, { status: 500 });
    }

    return NextResponse.json({ status });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to install tool';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
