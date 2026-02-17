import { NextResponse } from 'next/server';
import { getSettings } from '@shepai/core/infrastructure/services/settings.service';
import { createLauncherRegistry } from '@shepai/core/infrastructure/services/ide-launchers/ide-launcher.registry';
import { computeWorktreePath } from '@shepai/core/infrastructure/services/ide-launchers/compute-worktree-path';
import { validateToolbarInput } from '../../validate-toolbar-input';

export async function POST(request: Request) {
  const body = await request.json();
  const validation = validateToolbarInput(body);

  if ('error' in validation) {
    return NextResponse.json({ error: validation.error }, { status: validation.status });
  }

  const { repositoryPath, branch } = validation;

  try {
    const settings = getSettings();
    const editor = settings.environment.defaultEditor;
    const worktreePath = computeWorktreePath(repositoryPath, branch);

    const registry = createLauncherRegistry();
    const launcher = registry.get(editor);

    if (!launcher) {
      return NextResponse.json(
        { error: `No launcher found for editor: ${editor}` },
        { status: 404 }
      );
    }

    const available = await launcher.checkAvailable();
    if (!available) {
      return NextResponse.json(
        {
          error: `${launcher.name} is not available — ensure "${launcher.binary}" is installed and on your PATH`,
        },
        { status: 404 }
      );
    }

    await launcher.launch(worktreePath);

    return NextResponse.json({
      success: true,
      editor: launcher.name,
      path: worktreePath,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to open IDE';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
