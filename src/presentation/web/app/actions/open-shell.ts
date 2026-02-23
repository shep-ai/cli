'use server';

import { existsSync } from 'node:fs';
import { platform } from 'node:os';
import { spawn } from 'node:child_process';
import { getSettings } from '@shepai/core/infrastructure/services/settings.service';
import { computeWorktreePath } from '@shepai/core/infrastructure/services/ide-launchers/compute-worktree-path';

interface OpenShellInput {
  repositoryPath: string;
  branch?: string;
}

export async function openShell(
  input: OpenShellInput
): Promise<{ success: boolean; error?: string; path?: string; shell?: string }> {
  const { repositoryPath, branch } = input;

  if (!repositoryPath?.startsWith('/')) {
    return { success: false, error: 'repositoryPath must be an absolute path' };
  }

  try {
    const settings = getSettings();
    const shell = settings.environment.shellPreference;
    const targetPath = branch ? computeWorktreePath(repositoryPath, branch) : repositoryPath;

    if (!existsSync(targetPath)) {
      return { success: false, error: `Path does not exist: ${targetPath}` };
    }

    const currentPlatform = platform();

    if (currentPlatform === 'darwin') {
      const child = spawn('open', ['-a', 'Terminal', targetPath], {
        detached: true,
        stdio: 'ignore',
      });
      child.unref();
    } else if (currentPlatform === 'linux') {
      const child = spawn('x-terminal-emulator', [`--working-directory=${targetPath}`], {
        detached: true,
        stdio: 'ignore',
      });
      child.unref();
    } else {
      return {
        success: false,
        error: `Unsupported platform: ${currentPlatform}. Shell launch is supported on macOS and Linux only.`,
      };
    }

    return { success: true, path: targetPath, shell };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to open shell';
    return { success: false, error: message };
  }
}
