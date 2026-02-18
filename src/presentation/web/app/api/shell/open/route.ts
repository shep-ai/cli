import { NextResponse } from 'next/server';
import { existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { getSettings } from '@shepai/core/infrastructure/services/settings.service';
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
    const shell = settings.environment.shellPreference;
    const worktreePath = computeWorktreePath(repositoryPath, branch);

    if (!existsSync(worktreePath)) {
      return NextResponse.json(
        { error: `Worktree path does not exist: ${worktreePath}` },
        { status: 404 }
      );
    }

    const platform = process.platform;

    if (platform === 'darwin') {
      const child = spawn('open', ['-a', 'Terminal', worktreePath], {
        detached: true,
        stdio: 'ignore',
      });
      child.unref();
    } else if (platform === 'linux') {
      const child = spawn('x-terminal-emulator', [`--working-directory=${worktreePath}`], {
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
      path: worktreePath,
      shell,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to open shell';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
