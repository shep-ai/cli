'use server';

import {
  FileDialogService,
  type FileAttachment,
} from '@shepai/core/infrastructure/services/file-dialog.service';

export async function pickFiles(): Promise<{ files: FileAttachment[] | null; error?: string }> {
  const service = new FileDialogService();

  try {
    const files = service.pickFiles();
    return { files };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to open file dialog';
    return { files: null, error: message };
  }
}
