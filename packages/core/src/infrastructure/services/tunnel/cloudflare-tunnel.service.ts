/**
 * Cloudflare Tunnel Service
 *
 * Manages a `cloudflared` quick-tunnel process that exposes a local port
 * to the public internet via a random *.trycloudflare.com subdomain.
 *
 * Key behaviors:
 * - Spawns `cloudflared tunnel --url http://localhost:<port>`
 * - Parses the assigned public URL from process stderr
 * - Detects URL changes on reconnection and notifies listeners
 * - Gracefully kills the process on stop()
 *
 * The tunnel exposes the full local port but only the webhook API route
 * should be registered with external services. Path-level filtering
 * happens at the webhook route handler, not the tunnel layer.
 */

import type { ChildProcess } from 'node:child_process';
import { spawn } from 'node:child_process';
import type {
  ITunnelService,
  TunnelUrlChangeHandler,
} from '../../../application/ports/output/services/tunnel-service.interface.js';
import { IS_WINDOWS } from '../../platform.js';

const TAG = '[CloudflareTunnel]';
const CLOUDFLARED_URL_REGEX = /https:\/\/[a-z0-9-]+\.trycloudflare\.com/;
const STARTUP_TIMEOUT_MS = 30_000;

export interface CloudflareTunnelDeps {
  spawnProcess: typeof spawn;
}

const defaultDeps: CloudflareTunnelDeps = {
  spawnProcess: spawn,
};

export class CloudflareTunnelService implements ITunnelService {
  private process: ChildProcess | null = null;
  private publicUrl: string | null = null;
  private readonly urlChangeHandlers: TunnelUrlChangeHandler[] = [];
  private readonly deps: CloudflareTunnelDeps;

  constructor(deps: Partial<CloudflareTunnelDeps> = {}) {
    this.deps = { ...defaultDeps, ...deps };
  }

  async start(localPort: number): Promise<string> {
    if (this.process) {
      throw new Error(`${TAG} Tunnel already running at ${this.publicUrl}`);
    }

    return new Promise<string>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.killProcess();
        reject(new Error(`${TAG} Timed out waiting for tunnel URL (${STARTUP_TIMEOUT_MS}ms)`));
      }, STARTUP_TIMEOUT_MS);

      const args = ['tunnel', '--url', `http://localhost:${localPort}`];

      const child = this.deps.spawnProcess('cloudflared', args, {
        stdio: ['ignore', 'pipe', 'pipe'],
        ...(IS_WINDOWS ? { windowsHide: true } : {}),
      });

      this.process = child;

      const handleOutput = (data: Buffer) => {
        const line = data.toString();
        const match = line.match(CLOUDFLARED_URL_REGEX);
        if (match) {
          const url = match[0];

          if (!this.publicUrl) {
            // First URL — startup complete
            this.publicUrl = url;
            clearTimeout(timeout);
            // eslint-disable-next-line no-console
            console.log(`${TAG} Tunnel ready: ${url}`);
            resolve(url);
          } else if (url !== this.publicUrl) {
            // URL changed — reconnection with new subdomain
            const oldUrl = this.publicUrl;
            this.publicUrl = url;
            // eslint-disable-next-line no-console
            console.log(`${TAG} Tunnel URL changed: ${oldUrl} -> ${url}`);
            this.notifyUrlChange(url);
          }
        }
      };

      child.stdout?.on('data', handleOutput);
      child.stderr?.on('data', handleOutput);

      child.on('error', (err) => {
        clearTimeout(timeout);
        this.process = null;
        this.publicUrl = null;

        if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
          reject(
            new Error(
              `${TAG} 'cloudflared' not found. Install it: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/`
            )
          );
        } else {
          reject(new Error(`${TAG} Failed to start tunnel: ${err.message}`));
        }
      });

      child.on('close', (code) => {
        clearTimeout(timeout);
        if (this.process === child) {
          this.process = null;
          const wasRunning = this.publicUrl !== null;
          this.publicUrl = null;

          if (wasRunning) {
            // eslint-disable-next-line no-console
            console.log(`${TAG} Tunnel process exited (code ${code})`);
          } else {
            // Process exited before producing a URL
            reject(new Error(`${TAG} cloudflared exited with code ${code} before producing a URL`));
          }
        }
      });
    });
  }

  async stop(): Promise<void> {
    this.killProcess();
    this.publicUrl = null;
  }

  getPublicUrl(): string | null {
    return this.publicUrl;
  }

  onUrlChange(handler: TunnelUrlChangeHandler): void {
    this.urlChangeHandlers.push(handler);
  }

  isRunning(): boolean {
    return this.process !== null && this.publicUrl !== null;
  }

  private killProcess(): void {
    if (this.process) {
      const child = this.process;
      this.process = null;

      try {
        // On Windows, tree-kill is needed for child processes.
        // cloudflared is well-behaved and exits on SIGTERM.
        if (!child.killed) {
          child.kill('SIGTERM');
        }
      } catch {
        // Process already exited
      }
    }
  }

  private notifyUrlChange(newUrl: string): void {
    for (const handler of this.urlChangeHandlers) {
      try {
        const result = handler(newUrl);
        if (result instanceof Promise) {
          result.catch((err) => {
            // eslint-disable-next-line no-console
            console.warn(`${TAG} URL change handler failed:`, err);
          });
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn(`${TAG} URL change handler threw:`, err);
      }
    }
  }
}
