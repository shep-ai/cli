/**
 * UpgradeCliUseCase
 *
 * Executes a self-upgrade of @shepai/cli to the latest published version.
 * Mirrors the CLI upgrade command logic but designed for use from the web layer.
 *
 * Flow:
 *   1. Check latest version from npm registry (fail-open)
 *   2. Compare with current version — return early if up to date
 *   3. Run `npm i -g @shepai/cli@latest` with streamed output
 *   4. Return result with old/new version info
 */

import { injectable, inject } from 'tsyringe';
import { spawn, type ChildProcess } from 'node:child_process';
import type { IVersionService } from '../../ports/output/services/version-service.interface.js';
import type { IDaemonService } from '../../ports/output/services/daemon-service.interface.js';

export interface UpgradeResult {
  status: 'up-to-date' | 'upgraded' | 'error';
  currentVersion: string;
  latestVersion: string | null;
  errorMessage?: string;
}

const VERSION_CHECK_TIMEOUT_MS = 10_000;
const NPM_CACHE_ADD_TIMEOUT_MS = 120_000;

/** Delay (ms) before the current process exits to allow the SSE response to flush. */
const SELF_RESTART_DELAY_MS = 1_000;

@injectable()
export class UpgradeCliUseCase {
  constructor(
    @inject('IVersionService')
    private readonly versionService: IVersionService,
    @inject('IDaemonService')
    private readonly daemonService: IDaemonService
  ) {}

  async execute(onOutput?: (data: string) => void): Promise<UpgradeResult> {
    const { version: currentVersion } = this.versionService.getVersion();

    // 1. Check latest version (fail-open)
    const latestVersion = await this.getLatestVersion(onOutput);

    // 2. Already up to date
    if (latestVersion && latestVersion === currentVersion) {
      onOutput?.(`Already up to date (v${currentVersion})\n`);
      return { status: 'up-to-date', currentVersion, latestVersion };
    }

    // 3. Pre-download the package into npm cache before install
    const target = latestVersion ? `v${latestVersion}` : 'latest';
    onOutput?.(`Downloading @shepai/cli@latest...\n`);
    const cached = await this.preDownloadPackage();
    if (!cached) {
      onOutput?.('Pre-download did not complete — proceeding with install...\n');
    }

    // 4. Run install (fast if cached)
    onOutput?.(`Upgrading from v${currentVersion} to ${target}...\n`);

    try {
      const exitCode = await this.runNpmInstall(onOutput);

      if (exitCode === 0) {
        onOutput?.(`Successfully upgraded to ${target}\n`);
        return { status: 'upgraded', currentVersion, latestVersion };
      } else {
        const msg = `npm install exited with code ${exitCode}`;
        onOutput?.(`Error: ${msg}\n`);
        return { status: 'error', currentVersion, latestVersion, errorMessage: msg };
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Installation failed';
      onOutput?.(`Error: ${msg}\n`);
      return { status: 'error', currentVersion, latestVersion, errorMessage: msg };
    }
  }

  private getLatestVersion(onOutput?: (data: string) => void): Promise<string | null> {
    return new Promise((resolve) => {
      let output = '';
      let settled = false;

      const child: ChildProcess = spawn('npm', ['view', '@shepai/cli', 'version'], {
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      const timeout = setTimeout(() => {
        if (!settled) {
          settled = true;
          child.kill();
          onOutput?.('Version check timed out, proceeding with upgrade...\n');
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
          onOutput?.('Could not check latest version\n');
          resolve(null);
        }
      });
    });
  }

  private preDownloadPackage(): Promise<boolean> {
    return new Promise((resolve) => {
      let settled = false;

      const child: ChildProcess = spawn('npm', ['cache', 'add', '@shepai/cli@latest'], {
        stdio: ['ignore', 'ignore', 'pipe'],
      });

      const timeout = setTimeout(() => {
        if (!settled) {
          settled = true;
          child.kill();
          resolve(false);
        }
      }, NPM_CACHE_ADD_TIMEOUT_MS);

      child.on('close', (code) => {
        if (!settled) {
          settled = true;
          clearTimeout(timeout);
          resolve(code === 0);
        }
      });

      child.on('error', () => {
        if (!settled) {
          settled = true;
          clearTimeout(timeout);
          resolve(false);
        }
      });
    });
  }

  /**
   * Schedule a daemon self-restart after upgrade.
   * Reads the current daemon port, spawns a new daemon process with the
   * upgraded code, then exits the current process after a brief delay.
   */
  async scheduleDaemonRestart(): Promise<void> {
    const state = await this.daemonService.read();
    const port = state?.port;

    // Delete daemon.json so the new process can write a fresh one
    await this.daemonService.delete();

    // Spawn new daemon process using the upgraded CLI binary.
    // Use process.argv[1] which points to the shep CLI entry point —
    // after npm install this resolves to the upgraded version on disk.
    const child = spawn(
      process.execPath,
      [...process.execArgv, process.argv[1], '_serve', ...(port ? ['--port', String(port)] : [])],
      {
        detached: true,
        stdio: 'ignore',
        windowsHide: true,
      }
    );
    child.unref();

    // Give the response stream time to flush, then exit the current process
    setTimeout(() => {
      process.exit(0);
    }, SELF_RESTART_DELAY_MS);
  }

  private runNpmInstall(onOutput?: (data: string) => void): Promise<number> {
    return new Promise((resolve, reject) => {
      const child = spawn('npm', ['i', '-g', '@shepai/cli@latest'], {
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      child.stdout?.on('data', (data: Buffer) => {
        onOutput?.(data.toString());
      });

      child.stderr?.on('data', (data: Buffer) => {
        onOutput?.(data.toString());
      });

      child.on('close', (code) => {
        resolve(code ?? 1);
      });

      child.on('error', (err) => {
        reject(err);
      });
    });
  }
}
