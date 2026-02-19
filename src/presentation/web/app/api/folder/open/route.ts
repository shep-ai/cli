import { NextResponse } from 'next/server';
import { existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { validateFolderInput } from '../../validate-folder-input';

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid or missing JSON body' }, { status: 400 });
  }

  const validation = validateFolderInput(body as Record<string, unknown>);

  if ('error' in validation) {
    return NextResponse.json({ error: validation.error }, { status: validation.status });
  }

  const { repositoryPath } = validation;

  try {
    if (!existsSync(repositoryPath)) {
      return NextResponse.json({ error: 'Directory not found' }, { status: 404 });
    }

    const platform = process.platform;

    if (platform === 'darwin') {
      const child = spawn('open', [repositoryPath], {
        detached: true,
        stdio: 'ignore',
      });
      child.unref();
    } else if (platform === 'linux') {
      const child = spawn('xdg-open', [repositoryPath], {
        detached: true,
        stdio: 'ignore',
      });
      child.unref();
    } else {
      return NextResponse.json(
        {
          error: `Unsupported platform: ${platform}. Folder open is supported on macOS and Linux only.`,
        },
        { status: 501 }
      );
    }

    return NextResponse.json({
      success: true,
      path: repositoryPath,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to open folder';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
