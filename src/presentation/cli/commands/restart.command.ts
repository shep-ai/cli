/**
 * restart Command
 *
 * Gracefully restarts the Shep web UI daemon. If the daemon is not running,
 * starts it instead. Accepts an optional --port flag (parity with shep start).
 *
 * Usage: shep restart [--port <number>]
 */

import { Command, InvalidArgumentError } from 'commander';
import { container } from '@/infrastructure/di/container.js';
import type { IDaemonService } from '@/application/ports/output/services/daemon-service.interface.js';
import { messages } from '../ui/index.js';
import { stopDaemon } from './daemon/stop-daemon.js';
import { startDaemon } from './daemon/start-daemon.js';

function parsePort(value: string): number {
  const port = parseInt(value, 10);
  if (isNaN(port) || port < 1024 || port > 65535) {
    throw new InvalidArgumentError('Port must be an integer between 1024 and 65535');
  }
  return port;
}

/**
 * Create the restart command.
 */
export function createRestartCommand(): Command {
  return new Command('restart')
    .description('Gracefully restart the Shep web UI daemon (starts it if not running)')
    .option('-p, --port <number>', 'Port number (1024-65535)', parsePort)
    .addHelpText(
      'after',
      `
Examples:
  $ shep restart               Restart (or start) on default port
  $ shep restart --port 8080   Restart on custom port`
    )
    .action(async (options: { port?: number }) => {
      const daemonService = container.resolve<IDaemonService>('IDaemonService');

      const state = await daemonService.read();
      const isRunning = state !== null && daemonService.isAlive(state.pid);

      if (isRunning) {
        // Daemon is running — stop it then start it, preserving the port unless overridden
        await stopDaemon(daemonService);
        await startDaemon({ port: options.port ?? state!.port });
      } else {
        // Daemon is not running — start it directly
        messages.info('Daemon was not running — starting...');
        await startDaemon({ port: options.port });
      }
    });
}
