import { NextRequest, NextResponse } from 'next/server';
import { readFile, stat } from 'fs/promises';
import { extname } from 'path';

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

export async function GET(request: NextRequest): Promise<NextResponse> {
  const path = request.nextUrl.searchParams.get('path');
  const mimeTypeHint = request.nextUrl.searchParams.get('mimeType');

  if (!path) {
    return NextResponse.json({ error: 'Missing path parameter' }, { status: 400 });
  }

  // Security: only allow paths within .shep/attachments
  if (!path.includes('.shep/attachments')) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  try {
    await stat(path);
    const buffer = await readFile(path);
    const ext = extname(path).toLowerCase();
    const contentType = MIME_MAP[ext] ?? mimeTypeHint ?? 'application/octet-stream';

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
