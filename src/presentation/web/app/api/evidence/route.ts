import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { readFile, stat } from 'fs/promises';
import { extname, resolve } from 'path';
import { getShepHomeDir } from '@shepai/core/infrastructure/services/filesystem/shep-directory.service';

const MIME_MAP: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.bmp': 'image/bmp',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mov': 'video/quicktime',
  '.txt': 'text/plain',
  '.log': 'text/plain',
  '.json': 'application/json',
  '.cast': 'application/json',
};

/**
 * Serves evidence files from ~/.shep/repos/ directories.
 * Security: only paths within SHEP_HOME/repos/ are allowed.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const path = request.nextUrl.searchParams.get('path');

  if (!path) {
    return NextResponse.json({ error: 'Missing path parameter' }, { status: 400 });
  }

  const resolved = resolve(path);
  const reposRoot = resolve(getShepHomeDir(), 'repos');

  if (!resolved.startsWith(reposRoot)) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  try {
    await stat(resolved);
    const buffer = await readFile(resolved);
    const ext = extname(resolved).toLowerCase();
    const contentType = MIME_MAP[ext] ?? 'application/octet-stream';

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch {
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }
}
