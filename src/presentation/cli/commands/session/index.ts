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
import { getCliI18n } from '../../i18n.js';

/**
 * Create the session command with ls and show subcommands
 */
export function createSessionCommand(): Command {
  const t = getCliI18n().t;
  return new Command('session')
    .description(t('cli:commands.session.description'))
    .addCommand(createLsCommand())
    .addCommand(createShowCommand());
}
