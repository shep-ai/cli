/**
 * Web Server Service
 *
 * Manages the Next.js programmatic server lifecycle.
 * Starts the web UI in the same Node.js process as the CLI,
 * sharing the DI container and application layer.
 *
 * Supports both development (dev: true) and production (dev: false) modes.
 * In production mode, Next.js serves the pre-built .next output.
 */

import { injectable } from 'tsyringe';
import next from 'next';
import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import type { IWebServerService } from '../../application/ports/output/web-server-service.interface.js';

type NextApp = ReturnType<typeof next>;

export interface WebServerDeps {
  createNextApp: typeof next;
  createHttpServer: typeof http.createServer;
}

const defaultDeps: WebServerDeps = {
  createNextApp: next,
  createHttpServer: http.createServer,
};

/**
 * Resolve the web UI directory path.
 * Works in both development (src/) and production (dist/) contexts.
 */
export function resolveWebDir(): { dir: string; dev: boolean } {
  // Check for development source directory first
  const devDir = path.resolve(import.meta.dirname, '../../presentation/web');
  if (fs.existsSync(path.join(devDir, 'next.config.ts'))) {
    return { dir: devDir, dev: true };
  }

  // Production: web UI is shipped alongside dist/ in the package
  const prodDir = path.resolve(import.meta.dirname, '../../../web');
  if (
    fs.existsSync(path.join(prodDir, 'next.config.ts')) ||
    fs.existsSync(path.join(prodDir, '.next'))
  ) {
    return { dir: prodDir, dev: false };
  }

  throw new Error('Web UI directory not found. Ensure the web UI is built (pnpm build:web).');
}

@injectable()
export class WebServerService implements IWebServerService {
  private app: NextApp | null = null;
  private server: http.Server | null = null;
  private isShuttingDown = false;
  private readonly deps: WebServerDeps;

  constructor(deps: Partial<WebServerDeps> = {}) {
    this.deps = { ...defaultDeps, ...deps };
  }

  /**
   * Start the Next.js web server.
   * @param port - Port to listen on
   * @param dir - Path to the Next.js web package directory
   * @param dev - Whether to run in development mode (default: auto-detect)
   */
  async start(port: number, dir: string, dev = true): Promise<void> {
    const app = this.deps.createNextApp({
      dev,
      dir,
      port,
      hostname: 'localhost',
    });

    const handle = app.getRequestHandler();
    await app.prepare();

    this.app = app;

    await new Promise<void>((resolve, reject) => {
      const server = this.deps.createHttpServer((req, res) => {
        handle(req!, res!);
      });

      server.on('error', reject);

      server.listen(port, 'localhost', () => {
        this.server = server;
        resolve();
      });
    });
  }

  /**
   * Gracefully stop the server.
   */
  async stop(): Promise<void> {
    if (this.isShuttingDown) return;
    this.isShuttingDown = true;

    try {
      if (this.server) {
        await new Promise<void>((resolve) => {
          this.server!.close(() => resolve());
        });
        this.server = null;
      }

      if (this.app) {
        await this.app.close();
        this.app = null;
      }
    } finally {
      this.isShuttingDown = false;
    }
  }
}
