import type { FileAttachment } from '@shepai/core/infrastructure/services/file-dialog.service';

/**
 * Calls the backend API to open a native OS file picker dialog.
 * Returns the selected files with metadata, or null if the user cancelled.
 */
export async function pickFiles(): Promise<FileAttachment[] | null> {
  const response = await fetch('/api/dialog/pick-files', { method: 'POST' });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.error ?? 'Failed to open file dialog');
  }

  const body: { files: FileAttachment[] | null; cancelled: boolean } = await response.json();
  return body.files;
}
