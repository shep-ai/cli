/**
 * Settings Command Group
 *
 * Provides subcommands for managing Shep global settings.
 *
 * Usage:
 *   shep settings show     # Display current settings
 *   shep settings init     # Initialize settings to defaults
 *   shep settings agent    # Configure AI coding agent
 */

import { Command } from 'commander';
import { createShowCommand } from './show.command.js';
import { createInitCommand } from './init.command.js';
import { createAgentCommand } from './agent.command.js';

/**
 * Create the settings command group
 */
export function createSettingsCommand(): Command {
  return new Command('settings')
    .description('Manage Shep global settings')
    .addCommand(createShowCommand())
    .addCommand(createInitCommand())
    .addCommand(createAgentCommand());
}
