/**
 * Upgrade Command
 *
 * Self-upgrades Shep CLI to the latest published version.
 * Checks current vs latest version before running npm install.
 *
 * Usage: shep upgrade
 */

import { Command } from 'commander';
import { spawn as defaultSpawn, type ChildProcess } from 'node:child_process';
import { container } from '@/infrastructure/di/container.js';
import type { IVersionService } from '@/application/ports/output/services/version-service.interface.js';
import { messages } from '../ui/index.js';

type SpawnFn = typeof defaultSpawn;

const VERSION_CHECK_TIMEOUT_MS = 10_000;

/**
 * Get the latest published version of @shepai/cli from npm registry.
 * Returns null if the check fails (fail-open).
 */
function getLatestVersion(spawnFn: SpawnFn): Promise<string | null> {
  return new Promise((resolve) => {
    let output = '';
    let settled = false;

    const child: ChildProcess = spawnFn('npm', ['view', '@shepai/cli', 'version'], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    const timeout = setTimeout(() => {
      if (!settled) {
        settled = true;
        child.kill();
        messages.warning('Could not complete version check (timed out)');
        resolve(null);
      }
    }, VERSION_CHECK_TIMEOUT_MS);

    child.stdout?.on('data', (data: Buffer) => {
      output += data.toString();
    });

    child.on('close', (code) => {
      if (!settled) {
        settled = true;
        clearTimeout(timeout);
        if (code === 0 && output.trim()) {
          resolve(output.trim());
        } else {
          resolve(null);
        }
      }
    });

    child.on('error', () => {
      if (!settled) {
        settled = true;
        clearTimeout(timeout);
        messages.warning('Could not complete version check');
        resolve(null);
      }
    });
  });
}

/**
 * Run npm i -g @shepai/cli@latest with inherited stdio.
 * Returns the exit code, or rejects on spawn error.
 */
function runNpmInstall(spawnFn: SpawnFn): Promise<number> {
  return new Promise((resolve, reject) => {
    const child = spawnFn('npm', ['i', '-g', '@shepai/cli@latest'], {
      stdio: 'inherit',
    });

    child.on('close', (code) => {
      resolve(code ?? 1);
    });

    child.on('error', (err) => {
      reject(err);
    });
  });
}

/**
 * Create the upgrade command
 */
export function createUpgradeCommand(spawnFn: SpawnFn = defaultSpawn): Command {
  return new Command('upgrade')
    .description('Upgrade Shep CLI to the latest version')
    .action(async () => {
      try {
        const versionService = container.resolve<IVersionService>('IVersionService');
        const { version: currentVersion } = versionService.getVersion();

        // 1. Check latest version (fail-open with timeout)
        const latestVersion = await getLatestVersion(spawnFn);

        // 2. Compare — exit early if up to date
        if (latestVersion && latestVersion === currentVersion) {
          messages.success(`Already up to date (v${currentVersion})`);
          return;
        }

        // 3. Show what we're doing
        if (latestVersion) {
          messages.info(`Upgrading from v${currentVersion} to v${latestVersion}`);
        } else {
          messages.info(`Upgrading from v${currentVersion} to latest`);
        }

        // 4. Run npm i -g @shepai/cli@latest with inherited stdio
        const exitCode = await runNpmInstall(spawnFn);

        if (exitCode === 0) {
          messages.success('Shep CLI upgraded successfully');
        } else {
          messages.error('Upgrade failed');
          process.exitCode = 1;
        }
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        messages.error('Upgrade failed', err);
        process.exitCode = 1;
      }
    });
}
