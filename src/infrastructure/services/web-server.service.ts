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

import { injectable, inject } from 'tsyringe';
import next from 'next';
import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import type { IWebServerService } from '../../application/ports/output/web-server-service.interface.js';
import type { ILogger } from '../../application/ports/output/logger.interface.js';

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
 * Development: import.meta.dirname = <root>/src/infrastructure/services/
 *   → ../../presentation/web → <root>/src/presentation/web/
 *
 * Production (npm install): import.meta.dirname = <root>/dist/src/infrastructure/services/
 *   → ../../../../web → <root>/web/
 */
export function resolveWebDir(): { dir: string; dev: boolean } {
  // Check for production build first (.next directory)
  // From dist/src/infrastructure/services/ we need 4 levels up to reach the package root
  const prodDir = path.resolve(import.meta.dirname, '../../../../web');
  if (fs.existsSync(path.join(prodDir, '.next'))) {
    return { dir: prodDir, dev: false };
  }

  // Development: check for source directory with next.config.ts
  const devDir = path.resolve(import.meta.dirname, '../../presentation/web');
  if (fs.existsSync(path.join(devDir, 'next.config.ts'))) {
    return { dir: devDir, dev: true };
  }

  throw new Error(
    `Web UI directory not found. Ensure the web UI is built (pnpm build:web).\n` +
      `  Searched:\n` +
      `    prod: ${prodDir} (.next: ${fs.existsSync(path.join(prodDir, '.next'))})\n` +
      `    dev:  ${devDir} (next.config.ts: ${fs.existsSync(path.join(devDir, 'next.config.ts'))})\n` +
      `  import.meta.dirname: ${import.meta.dirname}`
  );
}

@injectable()
export class WebServerService implements IWebServerService {
  private app: NextApp | null = null;
  private server: http.Server | null = null;
  private isShuttingDown = false;
  private readonly logger: ILogger;
  private readonly deps: WebServerDeps;

  constructor(@inject('ILogger') logger: ILogger, deps: Partial<WebServerDeps> = {}) {
    this.logger = logger;
    this.deps = { ...defaultDeps, ...deps };
  }

  /**
   * Start the Next.js web server.
   * @param port - Port to listen on
   * @param dir - Path to the Next.js web package directory
   * @param dev - Whether to run in development mode (default: auto-detect)
   */
  async start(port: number, dir: string, dev = true): Promise<void> {
    this.logger.info('Starting web server', { port, dir, dev });

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

      server.on('error', (error: Error) => {
        this.logger.error('Web server error', { error: error.message, stack: error.stack });
        reject(error);
      });

      server.listen(port, 'localhost', () => {
        this.server = server;
        this.logger.info('Web server started successfully', { port, hostname: 'localhost' });
        resolve();
      });
    });
  }

  /**
   * Gracefully stop the server.
   */
  async stop(): Promise<void> {
    if (this.isShuttingDown) {
      this.logger.debug('Web server shutdown already in progress');
      return;
    }
    this.isShuttingDown = true;

    try {
      this.logger.info('Stopping web server');

      if (this.server) {
        await new Promise<void>((resolve) => {
          this.server!.close(() => resolve());
        });
        this.server = null;
        this.logger.debug('HTTP server closed');
      }

      if (this.app) {
        await this.app.close();
        this.app = null;
        this.logger.debug('Next.js app closed');
      }

      this.logger.info('Web server stopped successfully');
    } finally {
      this.isShuttingDown = false;
    }
  }
}
