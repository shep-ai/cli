'use server';

import { existsSync } from 'node:fs';
import { platform } from 'node:os';
import { isAbsolute } from 'node:path';
import { spawn } from 'node:child_process';
import { getSettings } from '@shepai/core/infrastructure/services/settings.service';
import { computeWorktreePath } from '@shepai/core/infrastructure/services/ide-launchers/compute-worktree-path';
import { getTerminalEntries } from '@shepai/core/infrastructure/services/tool-installer/tool-metadata';

/** Resolves a platform-keyed value to the current platform string. */
function resolvePlatformValue(value: string | Record<string, string>): string {
  if (typeof value === 'string') return value;
  return value[platform()] ?? Object.values(value)[0];
}

// Fallback commands for the "system" terminal when no tool metadata entry exists.
// Uses a record lookup instead of if/else to prevent the bundler from
// tree-shaking platform branches at build time. Turbopack evaluates
// os.platform() during the build and dead-code-eliminates unused branches,
// baking in the CI platform (linux) and breaking macOS/Windows installs.
const SYSTEM_TERMINAL_COMMANDS: Record<string, { cmd: string; args: (path: string) => string[] }> =
  {
    darwin: { cmd: 'open', args: (p) => ['-a', 'Terminal', p] },
    linux: { cmd: 'x-terminal-emulator', args: (p) => [`--working-directory=${p}`] },
    win32: {
      cmd: 'cmd.exe',
      args: (p) => ['/c', 'start', 'powershell', '-NoExit', '-Command', `Set-Location "${p}"`],
    },
  };

interface OpenShellInput {
  repositoryPath: string;
  branch?: string;
}

export async function openShell(
  input: OpenShellInput
): Promise<{ success: boolean; error?: string; path?: string; shell?: string }> {
  const { repositoryPath, branch } = input;

  if (!repositoryPath || !isAbsolute(repositoryPath)) {
    return { success: false, error: 'repositoryPath must be an absolute path' };
  }

  try {
    const settings = getSettings();
    const shell = settings.environment.shellPreference;
    const terminalPref = settings.environment.terminalPreference ?? 'system';
    const targetPath = branch ? computeWorktreePath(repositoryPath, branch) : repositoryPath;

    if (!existsSync(targetPath)) {
      return { success: false, error: `Path does not exist: ${targetPath}` };
    }

    // Try to find the terminal in tool metadata for non-system terminals
    if (terminalPref !== 'system') {
      const entries = getTerminalEntries();
      const terminalEntry = entries.find(([id]) => id === terminalPref);

      if (terminalEntry) {
        const [, meta] = terminalEntry;
        if (meta.openDirectory) {
          const openCmd = resolvePlatformValue(meta.openDirectory);
          if (openCmd.includes('{dir}')) {
            const resolved = openCmd.replace('{dir}', targetPath);
            const useShell = meta.spawnOptions?.shell === true;

            if (useShell) {
              const child = spawn(resolved, [], {
                detached: true,
                stdio: 'ignore',
                shell: true,
              });
              child.on('error', () => undefined);
              child.unref();
            } else {
              const [command, ...args] = resolved.split(/\s+/);
              const child = spawn(command, args, {
                detached: true,
                stdio: 'ignore',
              });
              child.on('error', () => undefined);
              child.unref();
            }

            return { success: true, path: targetPath, shell };
          }
        }
      }
    }

    // Fallback to system terminal
    const entry = SYSTEM_TERMINAL_COMMANDS[platform()];
    if (!entry) {
      return {
        success: false,
        error: `Unsupported platform: ${platform()}`,
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
