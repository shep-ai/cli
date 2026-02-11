/**
 * Feature Command Group
 *
 * Provides subcommands for managing features through the SDLC lifecycle.
 *
 * Usage:
 *   shep feat new <description>  # Create a new feature
 *   shep feat ls                 # List features
 *   shep feat show <id>          # Show feature details
 *   shep feat del <id>           # Delete a feature
 */

import { Command } from 'commander';
import { createNewCommand } from './new.command.js';
import { createLsCommand } from './ls.command.js';
import { createShowCommand } from './show.command.js';
import { createDelCommand } from './del.command.js';

/**
 * Create the feat command group
 */
export function createFeatCommand(): Command {
  return new Command('feat')
    .description('Manage features through the SDLC lifecycle')
    .addCommand(createNewCommand())
    .addCommand(createLsCommand())
    .addCommand(createShowCommand())
    .addCommand(createDelCommand());
}
