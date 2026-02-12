/**
 * Agent Command
 *
 * Top-level agent command with subcommands for managing and viewing agent runs.
 *
 * Usage:
 *   shep agent [subcommand]
 *
 * Subcommands:
 *   shep agent show <id>     Display details of an agent run
 *   shep agent ls             List all agent runs
 *   shep agent stop <id>     Stop a running agent
 *   shep agent logs <id>     View agent run logs
 *   shep agent delete <id>   Delete an agent run record
 */

import { Command } from 'commander';
import { createShowCommand } from './show.command.js';
import { createLsCommand } from './ls.command.js';
import { createStopCommand } from './stop.command.js';
import { createLogsCommand } from './logs.command.js';
import { createDeleteCommand } from './delete.command.js';
import { createApproveCommand } from './approve.command.js';
import { createRejectCommand } from './reject.command.js';

/**
 * Create the agent command with all subcommands
 */
export function createAgentCommand(): Command {
  const agent = new Command('agent')
    .description('Manage and view agent runs')
    .addCommand(createShowCommand())
    .addCommand(createLsCommand())
    .addCommand(createStopCommand())
    .addCommand(createLogsCommand())
    .addCommand(createDeleteCommand())
    .addCommand(createApproveCommand())
    .addCommand(createRejectCommand());

  return agent;
}
