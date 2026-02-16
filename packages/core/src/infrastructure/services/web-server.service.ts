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
import type { IWebServerService } from '../../application/ports/output/services/web-server-service.interface.js';

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
 *
 * Development: import.meta.dirname = <root>/packages/core/src/infrastructure/services/
 *   → 5 levels up → <root>/src/presentation/web/
 *
 * Production (npm install): import.meta.dirname = <root>/dist/packages/core/src/infrastructure/services/
 *   → 6 levels up → <root>/web/
 */
export function resolveWebDir(): { dir: string; dev: boolean } {
  // Check for development source directory first
  // From packages/core/src/infrastructure/services/ → 5 levels up to root, then src/presentation/web
  const devDir = path.resolve(import.meta.dirname, '../../../../../src/presentation/web');
  if (fs.existsSync(path.join(devDir, 'next.config.ts'))) {
    return { dir: devDir, dev: true };
  }

  // Production: web UI is shipped alongside dist/ in the package
  // From dist/packages/core/src/infrastructure/services/ → 6 levels up to package root
  const prodDir = path.resolve(import.meta.dirname, '../../../../../../web');
  if (fs.existsSync(path.join(prodDir, '.next'))) {
    return { dir: prodDir, dev: false };
  }

  throw new Error(
    `Web UI directory not found. Ensure the web UI is built (pnpm build:web).\n` +
      `  Searched:\n` +
      `    dev:  ${devDir} (next.config.ts: ${fs.existsSync(path.join(devDir, 'next.config.ts'))})\n` +
      `    prod: ${prodDir} (.next: ${fs.existsSync(path.join(prodDir, '.next'))})\n` +
      `  import.meta.dirname: ${import.meta.dirname}`
  );
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
