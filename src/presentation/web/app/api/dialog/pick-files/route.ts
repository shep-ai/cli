import { NextResponse } from 'next/server';
import { FileDialogService } from '@shepai/core/infrastructure/services/file-dialog.service';

export async function POST() {
  const service = new FileDialogService();

  try {
    const files = service.pickFiles();

    if (files === null) {
      return NextResponse.json({ files: null, cancelled: true });
    }

    return NextResponse.json({ files, cancelled: false });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to open file dialog';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
