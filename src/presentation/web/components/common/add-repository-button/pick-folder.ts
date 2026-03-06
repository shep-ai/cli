import { pickFolder as pickFolderAction } from '@/app/actions/pick-folder';

/**
 * Opens a native OS folder picker dialog via server action.
 * Returns the selected absolute path, or null if the user cancelled.
 */
export async function pickFolder(): Promise<string | null> {
  const result = await pickFolderAction();

  if (result.error) {
    throw new Error(result.error);
  }

  return result.path;
}
