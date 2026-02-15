/**
 * Calls the backend API to open a native OS folder picker dialog.
 * Returns the selected absolute path, or null if the user cancelled.
 */
export async function pickFolder(): Promise<string | null> {
  const response = await fetch('/api/dialog/pick-folder', { method: 'POST' });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.error ?? 'Failed to open folder dialog');
  }

  const body: { path: string | null; cancelled: boolean } = await response.json();
  return body.path;
}
