/**
 * Session Command
 *
 * Top-level session command with subcommands for listing and inspecting
 * agent provider CLI sessions.
 *
 * Usage:
 *   shep session [subcommand]
 *
 * Subcommands:
 *   shep session ls              List agent provider CLI sessions
 *   shep session show <id>       Display details of a specific session
 */

import { Command } from 'commander';
import { createLsCommand } from './ls.command.js';
import { createShowCommand } from './show.command.js';

/**
 * Create the session command with ls and show subcommands
 */
export function createSessionCommand(): Command {
  return new Command('session')
    .description('Manage and view agent provider CLI sessions')
    .addCommand(createLsCommand())
    .addCommand(createShowCommand());
}
