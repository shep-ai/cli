/**
 * IDE Configuration Command
 *
 * Configures the preferred IDE/editor used by Shep.
 * Valid editors are derived dynamically from JSON tool metadata.
 *
 * Usage:
 *   shep settings ide                    # Interactive selection
 *   shep settings ide --editor cursor    # Non-interactive
 */

import { Command } from 'commander';
import { select } from '@inquirer/prompts';
import { container } from '@/infrastructure/di/container.js';
import { UpdateSettingsUseCase } from '@/application/use-cases/settings/update-settings.use-case.js';
import { createIdeSelectConfig } from '../../../tui/prompts/ide-select.prompt.js';
import {
  getSettings,
  resetSettings,
  initializeSettings,
} from '@/infrastructure/services/settings.service.js';
import type { IIdeLauncherService } from '@/application/ports/output/services/ide-launcher-service.interface.js';
import type { EditorType } from '@/domain/generated/output.js';
import { getIdeEntries } from '@/infrastructure/services/tool-installer/tool-metadata.js';
import { messages } from '../../ui/index.js';

/** Valid IDE tool IDs derived from JSON metadata. */
const VALID_EDITORS = new Set<string>(getIdeEntries().map(([id]) => id));

/**
 * Create the IDE configuration command.
 */
export function createIdeCommand(): Command {
  return new Command('ide')
    .description('Configure preferred IDE/editor')
    .option('--editor <name>', `IDE/editor name (${[...VALID_EDITORS].join(', ')})`)
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
          if (!VALID_EDITORS.has(options.editor)) {
            messages.error(
              `Unknown editor "${options.editor}". Valid: ${[...VALID_EDITORS].join(', ')}`,
              new Error(`Unknown editor: ${options.editor}`)
            );
            process.exitCode = 1;
            return;
          }
          editorValue = options.editor;
        } else {
          editorValue = await select(createIdeSelectConfig());
        }

        // PATH check via IDE launcher service (non-blocking warning)
        const ideLauncher = container.resolve<IIdeLauncherService>('IIdeLauncherService');
        const available = await ideLauncher.checkAvailability(editorValue);
        if (!available) {
          messages.warning(
            `Editor '${editorValue}' not found in PATH. The editor will still be saved.`
          );
        }

        // Persist settings
        const settings = getSettings();
        settings.environment.defaultEditor = editorValue as EditorType;

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
