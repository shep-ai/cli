'use server';

import { existsSync } from 'node:fs';
import { spawn } from 'node:child_process';

export async function openFolder(
  repositoryPath: string
): Promise<{ success: boolean; error?: string; path?: string }> {
  if (!repositoryPath?.startsWith('/')) {
    return { success: false, error: 'repositoryPath must be an absolute path' };
  }

  try {
    if (!existsSync(repositoryPath)) {
      return { success: false, error: 'Directory not found' };
    }

    const platform = process.platform;

    if (platform === 'darwin') {
      const child = spawn('open', [repositoryPath], {
        detached: true,
        stdio: 'ignore',
      });
      child.unref();
    } else if (platform === 'linux') {
      const child = spawn('xdg-open', [repositoryPath], {
        detached: true,
        stdio: 'ignore',
      });
      child.unref();
    } else {
      return {
        success: false,
        error: `Unsupported platform: ${platform}. Folder open is supported on macOS and Linux only.`,
      };
    }

    return { success: true, path: repositoryPath };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to open folder';
    return { success: false, error: message };
  }
}
