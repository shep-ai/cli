import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { readFile, stat, readdir } from 'fs/promises';
import { basename, extname, join, resolve } from 'path';
import { getShepHomeDir } from '@shepai/core/infrastructure/services/filesystem/shep-directory.service';

const MIME_MAP: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.bmp': 'image/bmp',
  '.ico': 'image/x-icon',
  '.pdf': 'application/pdf',
  '.txt': 'text/plain',
  '.md': 'text/markdown',
  '.json': 'application/json',
  '.yaml': 'text/yaml',
  '.yml': 'text/yaml',
};

/**
 * When the exact path doesn't exist (e.g. pending-<id> was renamed to <slug>),
 * search all sibling attachment directories for the same filename.
 */
async function findAttachmentFallback(
  requestedPath: string,
  attachmentsRoot: string
): Promise<string | null> {
  const filename = basename(requestedPath);
  try {
    const dirs = await readdir(attachmentsRoot, { withFileTypes: true });
    for (const entry of dirs) {
      if (!entry.isDirectory()) continue;
      const candidate = join(attachmentsRoot, entry.name, filename);
      try {
        await stat(candidate);
        return candidate;
      } catch {
        // not in this directory
      }
    }
  } catch {
    // attachments root doesn't exist
  }
  return null;
}

function serveFile(filePath: string, mimeTypeHint: string | null) {
  return readFile(filePath).then((buffer) => {
    const ext = extname(filePath).toLowerCase();
    const contentType = MIME_MAP[ext] ?? mimeTypeHint ?? 'application/octet-stream';
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'private, max-age=3600',
      },
    });
  });
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const path = request.nextUrl.searchParams.get('path');
  const mimeTypeHint = request.nextUrl.searchParams.get('mimeType');

  if (!path) {
    return NextResponse.json({ error: 'Missing path parameter' }, { status: 400 });
  }

  // Security: only allow paths within SHEP_HOME/attachments
  const attachmentsRoot = resolve(getShepHomeDir(), 'attachments');
  if (!resolve(path).startsWith(attachmentsRoot)) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  try {
    await stat(path);
    return await serveFile(path, mimeTypeHint);
  } catch {
    // File not found at exact path — try fallback search
    // This handles the case where pending-<sessionId>/ was renamed to <featureSlug>/
    const fallbackPath = await findAttachmentFallback(path, attachmentsRoot);
    if (fallbackPath) {
      return await serveFile(fallbackPath, mimeTypeHint);
    }
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }
}
