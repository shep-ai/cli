/**
 * startDaemon() — Shared daemon-spawn helper
 *
 * Contains the parent-side logic for starting the Shep web UI as a
 * detached background daemon. Used by both:
 *   - The default `shep` action (index.ts)
 *   - The `shep start` command (start.command.ts)
 *
 * Flow:
 *   1. Resolve available port (respects --port override)
 *   2. Check if daemon is already running (idempotent — print URL and return)
 *   3. Spawn the daemon: process.execPath _serve --port N
 *      {detached: true, stdio: 'ignore'} + child.unref()
 *   4. Write daemon.json atomically via IDaemonService
 *   5. Print formatted URL to stdout
 *   6. Open browser via BrowserOpenerService
 */

import { spawn } from 'node:child_process';
import { container } from '@/infrastructure/di/container.js';
import { findAvailablePort, DEFAULT_PORT } from '@/infrastructure/services/port.service.js';
import { BrowserOpenerService } from '@/infrastructure/services/browser-opener.service.js';
import { colors, fmt, messages } from '../../ui/index.js';
import type { IDaemonService } from '@/application/ports/output/services/daemon-service.interface.js';

export interface StartDaemonOptions {
  port?: number;
}

/**
 * Start the Shep web UI as a detached background daemon.
 * Idempotent: if a daemon is already running, prints the existing URL and returns.
 */
export async function startDaemon(opts: StartDaemonOptions = {}): Promise<void> {
  const daemonService = container.resolve<IDaemonService>('IDaemonService');

  // Check for an already-running daemon
  const existing = await daemonService.read();
  if (existing && daemonService.isAlive(existing.pid)) {
    const url = `http://localhost:${existing.port}`;
    messages.newline();
    messages.info(`Shep is already running at ${fmt.code(url)}`);
    messages.newline();
    return;
  }

  // Resolve the port
  const startPort = opts.port ?? DEFAULT_PORT;
  const port = await findAvailablePort(startPort);

  // Spawn the daemon as a detached child process.
  // process.argv[1] is the CLI script path (dist/index.js when installed, or the tsx
  // script path in dev mode). This allows the child to find and run the _serve subcommand.
  const child = spawn(process.execPath, [process.argv[1], '_serve', '--port', String(port)], {
    detached: true,
    stdio: 'ignore',
  });

  // Unref immediately so the parent event loop is not held open by the child
  child.unref();

  // Write daemon.json atomically
  await daemonService.write({
    pid: child.pid!,
    port,
    startedAt: new Date().toISOString(),
  });

  // Print formatted URL
  const url = `http://localhost:${port}`;
  messages.newline();
  console.log(fmt.heading('Shep Web UI'));
  messages.newline();
  messages.success(`Server starting at ${fmt.code(url)}`);
  console.log(colors.muted('The browser will open when the server is ready.'));
  messages.newline();

  // Open the browser
  const opener = new BrowserOpenerService({ warn: messages.warning });
  opener.open(url);
}
