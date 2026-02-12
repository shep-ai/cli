/**
 * Agent Command
 *
 * Top-level agent command with subcommands for managing and viewing agent runs.
 *
 * Usage:
 *   shep agent [subcommand]
 *
 * Subcommands:
 *   shep agent show <id>   Display details of an agent run
 *   shep agent list        List all agent runs
 */

import { Command } from 'commander';
import { createShowCommand } from './show.command.js';
import { createListCommand } from './list.command.js';

/**
 * Create the agent command with all subcommands
 */
export function createAgentCommand(): Command {
  const agent = new Command('agent')
    .description('Manage and view agent runs')
    .addCommand(createShowCommand())
    .addCommand(createListCommand());

  return agent;
}
