/**
 * Settings Command Group
 *
 * Provides subcommands for managing Shep global settings.
 * Running `shep settings` with no subcommand launches the full setup wizard.
 *
 * Usage:
 *   shep settings               # Launch full setup wizard (agent + IDE + workflow)
 *   shep settings show          # Display current settings
 *   shep settings init          # Initialize settings to defaults
 *   shep settings agent         # Configure AI coding agent
 *   shep settings ide           # Configure preferred IDE
 *   shep settings workflow      # Configure workflow defaults
 *   shep settings experimental  # Manage experimental feature flags
 */

import { Command } from 'commander';
import { createShowCommand } from './show.command.js';
import { createInitCommand } from './init.command.js';
import { createAgentCommand } from './agent.command.js';
import { createIdeCommand } from './ide.command.js';
import { createWorkflowCommand } from './workflow.command.js';
import { createExperimentalCommand } from './experimental.command.js';
import { onboardingWizard } from '../../../tui/wizards/onboarding/onboarding.wizard.js';
import { messages } from '../../ui/index.js';

/**
 * Create the settings command group
 */
export function createSettingsCommand(): Command {
  const cmd = new Command('settings')
    .description('Manage Shep global settings')
    .addCommand(createShowCommand())
    .addCommand(createInitCommand())
    .addCommand(createAgentCommand())
    .addCommand(createIdeCommand())
    .addCommand(createWorkflowCommand())
    .addCommand(createExperimentalCommand());

  // Default action: launch the full setup wizard when no subcommand is given
  cmd.action(async () => {
    try {
      await onboardingWizard();
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      messages.error('Settings wizard failed', err);
      process.exitCode = 1;
    }
  });

  return cmd;
}
