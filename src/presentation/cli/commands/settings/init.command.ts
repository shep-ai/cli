/**
 * Init Settings Command
 *
 * Re-initializes Shep settings to defaults with confirmation prompt.
 *
 * Usage:
 *   shep settings init          # Prompt for confirmation
 *   shep settings init --force  # Skip confirmation
 */

import { Command } from 'commander';

/**
 * Create the init settings command
 * (Implementation in Phase 2)
 */
export function createInitCommand(): Command {
  return new Command('init')
    .description('Initialize settings to defaults')
    .option('-f, --force', 'Skip confirmation prompt')
    .action(() => {
      throw new Error('Not implemented');
    });
}
