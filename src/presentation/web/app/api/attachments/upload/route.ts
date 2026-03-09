import { NextResponse } from 'next/server';
import { resolve } from '@/lib/server-container';
import type { AttachmentStorageService } from '@shepai/core/infrastructure/services/attachment-storage.service';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

const ALLOWED_EXTENSIONS = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.webp',
  '.svg',
  '.bmp',
  '.ico',
  '.pdf',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.ppt',
  '.pptx',
  '.txt',
  '.md',
  '.csv',
  '.json',
  '.yaml',
  '.yml',
  '.xml',
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.py',
  '.rb',
  '.go',
  '.rs',
  '.java',
  '.c',
  '.cpp',
  '.h',
  '.hpp',
  '.cs',
  '.swift',
  '.kt',
  '.html',
  '.css',
  '.scss',
  '.less',
  '.sh',
  '.bash',
  '.zsh',
  '.fish',
  '.toml',
  '.ini',
  '.cfg',
  '.conf',
  '.env',
  '.zip',
  '.tar',
  '.gz',
  '.log',
]);

function getExtension(filename: string): string {
  const dot = filename.lastIndexOf('.');
  return dot >= 0 ? filename.slice(dot).toLowerCase() : '';
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const sessionId = formData.get('sessionId') as string | null;

    if (!file || !sessionId) {
      return NextResponse.json(
        { error: 'Missing required fields: file, sessionId' },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          error: `File "${file.name}" exceeds 10 MB limit (${(file.size / 1024 / 1024).toFixed(1)} MB)`,
        },
        { status: 413 }
      );
    }

    // Validate extension
    const ext = getExtension(file.name);
    if (ext && !ALLOWED_EXTENSIONS.has(ext)) {
      return NextResponse.json({ error: `File type "${ext}" is not allowed` }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const service = resolve<AttachmentStorageService>('AttachmentStorageService');
    const attachment = service.store(
      buffer,
      file.name,
      file.type ?? 'application/octet-stream',
      sessionId
    );

    return NextResponse.json({
      id: attachment.id,
      name: attachment.name,
      size: Number(attachment.size),
      mimeType: attachment.mimeType,
      path: attachment.path,
      createdAt: attachment.createdAt,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Upload failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
