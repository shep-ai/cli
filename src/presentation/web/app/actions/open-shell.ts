'use server';

import { existsSync } from 'node:fs';
import { platform } from 'node:os';
import { spawn } from 'node:child_process';
import { getSettings } from '@shepai/core/infrastructure/services/settings.service';
import { computeWorktreePath } from '@shepai/core/infrastructure/services/ide-launchers/compute-worktree-path';

// Use a record lookup instead of if/else to prevent the bundler from
// tree-shaking platform branches at build time. Turbopack evaluates
// os.platform() during the build and dead-code-eliminates unused branches,
// baking in the CI platform (linux) and breaking macOS/Windows installs.
const SHELL_COMMANDS: Record<string, { cmd: string; args: (path: string) => string[] }> = {
  darwin: { cmd: 'open', args: (p) => ['-a', 'Terminal', p] },
  linux: { cmd: 'x-terminal-emulator', args: (p) => [`--working-directory=${p}`] },
};

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

    const entry = SHELL_COMMANDS[platform()];
    if (!entry) {
      return {
        success: false,
        error: `Unsupported platform: ${platform()}. Shell launch is supported on macOS and Linux only.`,
      };
    }

    const child = spawn(entry.cmd, entry.args(targetPath), {
      detached: true,
      stdio: 'ignore',
    });
    child.on('error', () => undefined); // Prevent uncaught exception on spawn failure
    child.unref();

    return { success: true, path: targetPath, shell };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to open shell';
    return { success: false, error: message };
  }
}
