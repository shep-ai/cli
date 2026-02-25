import { NextResponse } from 'next/server';
import {
  FileDialogService,
  type FileAttachment,
} from '@shepai/core/infrastructure/services/file-dialog.service';

export async function POST(): Promise<NextResponse> {
  const service = new FileDialogService();

  try {
    const files: FileAttachment[] | null = service.pickFiles();
    return NextResponse.json({ files, cancelled: files === null });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to open file dialog';
    return NextResponse.json({ files: null, cancelled: false, error: message }, { status: 500 });
  }
}
