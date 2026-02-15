import { NextResponse } from 'next/server';
import { FolderDialogService } from '@cli/infrastructure/services/folder-dialog.service';

export async function POST() {
  const service = new FolderDialogService();

  try {
    const path = service.pickFolder();

    if (path === null) {
      return NextResponse.json({ path: null, cancelled: true });
    }

    return NextResponse.json({ path, cancelled: false });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to open folder dialog';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
