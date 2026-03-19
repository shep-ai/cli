'use server';

import { existsSync } from 'node:fs';
import { platform } from 'node:os';
import { isAbsolute } from 'node:path';
import { spawn } from 'node:child_process';
import { getSettings } from '@shepai/core/infrastructure/services/settings.service';
import { computeWorktreePath } from '@shepai/core/infrastructure/services/ide-launchers/compute-worktree-path';
import { resolve } from '@/lib/server-container';
import type { IToolInstallerService } from '@shepai/core/application/ports/output/services/tool-installer.service';

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

    // Try to find the terminal in tool metadata via DI container.
    // Using DI (not a direct import from tool-metadata) ensures that
    // TOOL_METADATA is read from the correct tools/ directory path — it is loaded once
    // in the Node.js CLI bootstrap context where import.meta.url resolves correctly.
    // Direct imports of tool-metadata break in standalone production builds.
    if (terminalPref !== 'system') {
      try {
        const service = resolve<IToolInstallerService>('IToolInstallerService');
        const config = service.getTerminalOpenConfig(terminalPref);

        if (config?.openDirectory.includes('{dir}')) {
          const resolved = config.openDirectory.replace('{dir}', targetPath);

          if (config.shell) {
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
      } catch {
        // DI container not available — fall through to system terminal
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
