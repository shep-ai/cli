import { NextResponse } from 'next/server';
import { getSettings } from '@shepai/core/infrastructure/services/settings.service';
import type { LaunchIdeUseCase } from '@shepai/core/application/use-cases/ide/launch-ide.use-case';
import { resolve } from '@/lib/server-container';
import { validateToolbarInput } from '../../validate-toolbar-input';

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid or missing JSON body' }, { status: 400 });
  }

  const validation = validateToolbarInput(body as Record<string, unknown>);

  if ('error' in validation) {
    return NextResponse.json({ error: validation.error }, { status: validation.status });
  }

  const { repositoryPath, branch } = validation;

  const settings = getSettings();
  const editor = settings.environment.defaultEditor;

  const useCase = resolve<LaunchIdeUseCase>('LaunchIdeUseCase');
  const result = await useCase.execute({
    editorId: editor,
    repositoryPath,
    branch,
    checkAvailability: true,
  });

  if (!result.ok) {
    const status = result.code === 'launch_failed' ? 500 : 404;
    return NextResponse.json({ error: result.message }, { status });
  }

  return NextResponse.json({
    success: true,
    editor: result.editorName,
    path: result.worktreePath,
  });
}
