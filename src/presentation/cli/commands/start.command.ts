/**
 * start Command
 *
 * Starts the Shep web UI as a detached background daemon.
 * All spawn logic lives in the shared startDaemon() helper to avoid
 * duplication between this command and the default `shep` action.
 *
 * Usage: shep start [--port <number>]
 */

import { Command, InvalidArgumentError } from 'commander';
import { startDaemon } from './daemon/start-daemon.js';

function parsePort(value: string): number {
  const port = parseInt(value, 10);
  if (isNaN(port) || port < 1024 || port > 65535) {
    throw new InvalidArgumentError('Port must be an integer between 1024 and 65535');
  }
  return port;
}

/**
 * Create the start command.
 */
export function createStartCommand(): Command {
  return new Command('start')
    .description('Start the Shep web UI as a background daemon')
    .option('-p, --port <number>', 'Port number (1024-65535)', parsePort)
    .addHelpText(
      'after',
      `
Examples:
  $ shep start               Start on default port (4050)
  $ shep start --port 8080   Start on custom port`
    )
    .action(async (options: { port?: number }) => {
      await startDaemon({ port: options.port });
    });
}
