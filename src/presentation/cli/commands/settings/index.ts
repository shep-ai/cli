/**
 * Settings Command Group
 *
 * Provides subcommands for managing Shep global settings.
 *
 * Usage:
 *   shep settings show     # Display current settings
 *   shep settings init     # Initialize settings to defaults
 */

import { Command } from 'commander';
import { createShowCommand } from './show.command.js';

/**
 * Create the settings command group
 */
export function createSettingsCommand(): Command {
  return new Command('settings')
    .description('Manage Shep global settings')
    .addCommand(createShowCommand());
}
