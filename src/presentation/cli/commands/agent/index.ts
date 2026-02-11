/**
 * Agent Command Group
 *
 * Provides subcommands for managing agent runs.
 *
 * Usage:
 *   shep agent ls          # List agent runs
 *   shep agent show <id>   # Show agent run details
 */

import { Command } from 'commander';
import { createLsCommand } from './ls.command.js';
import { createShowCommand } from './show.command.js';

/**
 * Create the agent command group
 */
export function createAgentCommand(): Command {
  return new Command('agent')
    .description('Manage agent runs')
    .addCommand(createLsCommand())
    .addCommand(createShowCommand());
}
