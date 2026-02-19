import { NextResponse } from 'next/server';
import { existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { getSettings } from '@shepai/core/infrastructure/services/settings.service';
import { computeWorktreePath } from '@shepai/core/infrastructure/services/ide-launchers/compute-worktree-path';
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

  try {
    const settings = getSettings();
    const shell = settings.environment.shellPreference;
    const targetPath = branch ? computeWorktreePath(repositoryPath, branch) : repositoryPath;

    if (!existsSync(targetPath)) {
      return NextResponse.json({ error: `Path does not exist: ${targetPath}` }, { status: 404 });
    }

    const platform = process.platform;

    if (platform === 'darwin') {
      const child = spawn('open', ['-a', 'Terminal', targetPath], {
        detached: true,
        stdio: 'ignore',
      });
      child.unref();
    } else if (platform === 'linux') {
      const child = spawn('x-terminal-emulator', [`--working-directory=${targetPath}`], {
        detached: true,
        stdio: 'ignore',
      });
      child.unref();
    } else {
      return NextResponse.json(
        {
          error: `Unsupported platform: ${platform}. Shell launch is supported on macOS and Linux only.`,
        },
        { status: 501 }
      );
    }

    return NextResponse.json({
      success: true,
      path: targetPath,
      shell,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to open shell';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
