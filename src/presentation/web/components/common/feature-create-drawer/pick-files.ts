import type { FileAttachment } from '@shepai/core/infrastructure/services/file-dialog.service';

/**
 * Opens a native OS file picker dialog via API route.
 * Returns the selected files with metadata, or null if the user cancelled.
 */
export async function pickFiles(): Promise<FileAttachment[] | null> {
  const res = await fetch('/api/dialog/pick-files', { method: 'POST' });

  if (!res.ok) {
    throw new Error('Failed to open file dialog');
  }

  const data: { files: FileAttachment[] | null; cancelled: boolean } = await res.json();
  return data.cancelled ? null : data.files;
}
