/**
 * Logs Command
 *
 * Main command for log management with subcommands for:
 * - list: Display recent logs
 * - view: View single log details
 * - search: Full-text search
 * - tail: Real-time log following
 * - clear: Delete old logs
 * - stats: Display log statistics
 */

import { Command } from 'commander';
import { createListCommand } from './list.command.js';
import { createViewCommand } from './view.command.js';
import { createSearchCommand } from './search.command.js';
import { createTailCommand } from './tail.command.js';
import { createClearCommand } from './clear.command.js';
import { createStatsCommand } from './stats.command.js';

/**
 * Create the logs command with all subcommands
 */
export function createLogsCommand(): Command {
  const logsCommand = new Command('logs')
    .description('Manage and view application logs')
    .addHelpText(
      'after',
      `
Common workflows:
  View recent logs:              shep logs list
  Follow logs in real-time:      shep logs tail
  Search for specific errors:    shep logs search "error message"
  View full log details:         shep logs view <id>
  Delete old logs:               shep logs clear --days 30`
    );

  // Register all subcommands
  logsCommand.addCommand(createListCommand());
  logsCommand.addCommand(createViewCommand());
  logsCommand.addCommand(createSearchCommand());
  logsCommand.addCommand(createTailCommand());
  logsCommand.addCommand(createClearCommand());
  logsCommand.addCommand(createStatsCommand());

  return logsCommand;
}
