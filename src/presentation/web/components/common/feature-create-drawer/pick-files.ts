import type { FileAttachment } from '@shepai/core/infrastructure/services/file-dialog.service';
import { pickFiles as pickFilesAction } from '@/app/actions/pick-files';

/**
 * Opens a native OS file picker dialog via server action.
 * Returns the selected files with metadata, or null if the user cancelled.
 */
export async function pickFiles(): Promise<FileAttachment[] | null> {
  const result = await pickFilesAction();

  if (result.error) {
    throw new Error(result.error);
  }

  return result.files;
}
