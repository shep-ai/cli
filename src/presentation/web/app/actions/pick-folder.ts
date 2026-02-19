'use server';

import { FolderDialogService } from '@shepai/core/infrastructure/services/folder-dialog.service';

export async function pickFolder(): Promise<{ path: string | null; error?: string }> {
  const service = new FolderDialogService();

  try {
    const path = service.pickFolder();
    return { path };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to open folder dialog';
    return { path: null, error: message };
  }
}
