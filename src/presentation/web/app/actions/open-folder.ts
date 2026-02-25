'use server';

import { existsSync } from 'node:fs';
import { platform } from 'node:os';
import { spawn } from 'node:child_process';

// Use a record lookup instead of if/else to prevent the bundler from
// tree-shaking platform branches at build time. Turbopack evaluates
// os.platform() during the build and dead-code-eliminates unused branches,
// baking in the CI platform (linux) and breaking macOS/Windows installs.
const FOLDER_COMMANDS: Record<string, { cmd: string; args: (path: string) => string[] }> = {
  darwin: { cmd: 'open', args: (p) => [p] },
  linux: { cmd: 'xdg-open', args: (p) => [p] },
};

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

    const entry = FOLDER_COMMANDS[platform()];
    if (!entry) {
      return {
        success: false,
        error: `Unsupported platform: ${platform()}. Folder open is supported on macOS and Linux only.`,
      };
    }

    const child = spawn(entry.cmd, entry.args(repositoryPath), {
      detached: true,
      stdio: 'ignore',
    });
    child.on('error', () => undefined); // Prevent uncaught exception on spawn failure
    child.unref();

    return { success: true, path: repositoryPath };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to open folder';
    return { success: false, error: message };
  }
}
