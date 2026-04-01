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
import { getCliI18n } from '../i18n.js';

function parsePort(value: string): number {
  const port = parseInt(value, 10);
  if (isNaN(port) || port < 1024 || port > 65535) {
    throw new InvalidArgumentError(getCliI18n().t('cli:commands.start.portValidation'));
  }
  return port;
}

/**
 * Create the start command.
 */
export function createStartCommand(): Command {
  const t = getCliI18n().t;
  return new Command('start')
    .description(t('cli:commands.start.description'))
    .option('-p, --port <number>', t('cli:commands.start.portOption'), parsePort)
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
