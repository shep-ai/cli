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
import { createInterface } from 'node:readline';
import { createDefaultSettings } from '@/domain/factories/settings-defaults.factory.js';
import { resetSettings, initializeSettings } from '@/infrastructure/services/settings.service.js';
import { container } from '@/infrastructure/di/container.js';
import type { ISettingsRepository } from '@/application/ports/output/repositories/settings.repository.interface.js';
import { messages } from '../../ui/index.js';
import { getCliI18n } from '../../i18n.js';

/**
 * Prompt user for yes/no confirmation.
 * Returns false on EOF (no stdin) to prevent silent modifications.
 */
function confirm(message: string): Promise<boolean> {
  return new Promise((resolve) => {
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    let answered = false;

    rl.question(message, (answer) => {
      answered = true;
      rl.close();
      resolve(answer.toLowerCase() === 'y');
    });

    rl.on('close', () => {
      if (!answered) {
        resolve(false);
      }
    });
  });
}

/**
 * Create the init settings command
 */
export function createInitCommand(): Command {
  return new Command('init')
    .description(getCliI18n().t('cli:commands.settings.init.description'))
    .option('-f, --force', getCliI18n().t('cli:commands.settings.init.forceOption'))
    .addHelpText(
      'after',
      `
Examples:
  $ shep settings init           Prompt for confirmation before reset
  $ shep settings init --force   Reset settings without prompting
  $ shep settings init -f        Same as --force (short flag)`
    )
    .action(async (options: { force?: boolean }) => {
      try {
        if (!options.force) {
          messages.warning(getCliI18n().t('cli:commands.settings.init.resetWarning'));
          const confirmed = await confirm(
            getCliI18n().t('cli:commands.settings.init.confirmPrompt')
          );
          if (!confirmed) {
            messages.info(getCliI18n().t('cli:commands.settings.init.cancelled'));
            return;
          }
        }

        const repo = container.resolve<ISettingsRepository>('ISettingsRepository');
        const existing = await repo.load();
        const newSettings = createDefaultSettings();

        if (existing) {
          // Preserve the existing record's identity, reset everything else
          const resetSettings_db = {
            ...newSettings,
            id: existing.id,
            createdAt: existing.createdAt,
          };
          await repo.update(resetSettings_db);
        }

        // Update in-memory singleton
        resetSettings();
        initializeSettings(newSettings);

        messages.success(getCliI18n().t('cli:commands.settings.init.success'));
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        messages.error(getCliI18n().t('cli:commands.settings.init.failed'), err);
        process.exitCode = 1;
      }
    });
}
