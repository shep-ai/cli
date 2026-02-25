/**
 * Experimental Features Command
 *
 * Manages experimental feature flags via list/enable/disable subcommands.
 *
 * Usage:
 *   shep settings experimental list              # Show all flags with status
 *   shep settings experimental enable <flag>      # Enable a flag
 *   shep settings experimental disable <flag>     # Disable a flag
 */

import { Command } from 'commander';
import { container } from '@/infrastructure/di/container.js';
import { UpdateSettingsUseCase } from '@/application/use-cases/settings/update-settings.use-case.js';
import {
  EXPERIMENTAL_FLAGS,
  type ExperimentalFlagKey,
} from '@/domain/constants/experimental-flags.js';
import {
  getSettings,
  resetSettings,
  initializeSettings,
} from '@/infrastructure/services/settings.service.js';
import { messages } from '../../ui/index.js';
import pc from 'picocolors';

function isValidFlag(flag: string): flag is ExperimentalFlagKey {
  return flag in EXPERIMENTAL_FLAGS;
}

/**
 * Create the experimental features command group.
 */
export function createExperimentalCommand(): Command {
  const cmd = new Command('experimental').description('Manage experimental feature flags');

  cmd.addCommand(createListCommand());
  cmd.addCommand(createEnableCommand());
  cmd.addCommand(createDisableCommand());

  return cmd;
}

function createListCommand(): Command {
  return new Command('list')
    .description('List all experimental feature flags with their current status')
    .action(() => {
      const settings = getSettings();

      console.log(`\n  ${pc.bold('Experimental Features')}\n`);

      for (const [key, meta] of Object.entries(EXPERIMENTAL_FLAGS)) {
        const enabled = settings.experimental[key as ExperimentalFlagKey];
        const status = enabled ? pc.green('enabled') : pc.gray('disabled');

        console.log(`  ${pc.bold(meta.name)} ${pc.gray(`(${key})`)}`);
        console.log(`    ${meta.description}`);
        console.log(`    Status: ${status}`);
        console.log('');
      }
    });
}

function createEnableCommand(): Command {
  return new Command('enable')
    .description('Enable an experimental feature flag')
    .argument('<flag>', 'Flag name to enable')
    .action(async (flag: string) => {
      if (!isValidFlag(flag)) {
        messages.error(
          `Unknown experimental flag '${flag}'. Run 'shep settings experimental list' to see available flags.`
        );
        return;
      }

      try {
        const settings = getSettings();
        settings.experimental[flag] = true;

        const useCase = container.resolve(UpdateSettingsUseCase);
        const updatedSettings = await useCase.execute(settings);

        resetSettings();
        initializeSettings(updatedSettings);

        messages.success(`Experimental flag '${flag}' enabled.`);
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        messages.error('Failed to enable experimental flag', err);
        process.exitCode = 1;
      }
    });
}

function createDisableCommand(): Command {
  return new Command('disable')
    .description('Disable an experimental feature flag')
    .argument('<flag>', 'Flag name to disable')
    .action(async (flag: string) => {
      if (!isValidFlag(flag)) {
        messages.error(
          `Unknown experimental flag '${flag}'. Run 'shep settings experimental list' to see available flags.`
        );
        return;
      }

      try {
        const settings = getSettings();
        settings.experimental[flag] = false;

        const useCase = container.resolve(UpdateSettingsUseCase);
        const updatedSettings = await useCase.execute(settings);

        resetSettings();
        initializeSettings(updatedSettings);

        messages.success(`Experimental flag '${flag}' disabled.`);
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        messages.error('Failed to disable experimental flag', err);
        process.exitCode = 1;
      }
    });
}
