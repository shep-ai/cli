/**
 * IDE Configuration Command
 *
 * Configures the preferred IDE/editor used by Shep.
 *
 * Usage:
 *   shep settings ide                    # Interactive selection
 *   shep settings ide --editor cursor    # Non-interactive
 */

import { Command } from 'commander';
import { select } from '@inquirer/prompts';
import { container } from '../../../../infrastructure/di/container.js';
import { UpdateSettingsUseCase } from '../../../../application/use-cases/settings/update-settings.use-case.js';
import { createIdeSelectConfig } from '../../../tui/prompts/ide-select.prompt.js';
import {
  getSettings,
  resetSettings,
  initializeSettings,
} from '../../../../infrastructure/services/settings.service.js';
import { createLauncherRegistry } from '../../../../infrastructure/services/ide-launchers/ide-launcher.registry.js';
import { messages } from '../../ui/index.js';

/**
 * Create the IDE configuration command.
 */
export function createIdeCommand(): Command {
  return new Command('ide')
    .description('Configure preferred IDE/editor')
    .option('--editor <name>', 'IDE/editor name (e.g., vscode, cursor, windsurf, zed, antigravity)')
    .addHelpText(
      'after',
      `
Examples:
  $ shep settings ide                           Interactive selection
  $ shep settings ide --editor cursor           Non-interactive
  $ shep settings ide --editor antigravity      Set Google Antigravity`
    )
    .action(async (options: { editor?: string }) => {
      try {
        let editorValue: string;

        if (options.editor !== undefined) {
          editorValue = options.editor;
        } else {
          editorValue = await select(createIdeSelectConfig());
        }

        // PATH check via launcher registry (non-blocking warning)
        const registry = createLauncherRegistry();
        const launcher = registry.get(editorValue);
        if (launcher) {
          const available = await launcher.checkAvailable();
          if (!available) {
            messages.warning(
              `'${launcher.binary}' not found in PATH. The editor will still be saved.`
            );
          }
        }

        // Persist settings
        const settings = getSettings();
        settings.environment.defaultEditor = editorValue;

        const useCase = container.resolve(UpdateSettingsUseCase);
        const updatedSettings = await useCase.execute(settings);

        // Refresh in-memory singleton
        resetSettings();
        initializeSettings(updatedSettings);

        messages.success(`Default editor set to: ${editorValue}`);
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));

        if (err.message.includes('force closed') || err.message.includes('User force closed')) {
          messages.info('Configuration cancelled.');
          return;
        }

        messages.error('Failed to configure IDE', err);
        process.exitCode = 1;
      }
    });
}
