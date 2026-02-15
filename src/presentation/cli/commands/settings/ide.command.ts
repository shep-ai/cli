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
import { messages } from '../../ui/index.js';

/** Map of editor names to their CLI binary names for PATH checking. */
const IDE_BINARY_MAP: Record<string, string> = {
  vscode: 'code',
  cursor: 'cursor',
  windsurf: 'windsurf',
  zed: 'zed',
};

/**
 * Check if a binary exists in PATH. Returns true if found.
 */
export async function checkBinaryInPath(binary: string): Promise<boolean> {
  const { execFile } = await import('node:child_process');
  return new Promise((resolve) => {
    execFile('which', [binary], (err) => {
      resolve(!err);
    });
  });
}

/**
 * Create the IDE configuration command.
 */
export function createIdeCommand(): Command {
  return new Command('ide')
    .description('Configure preferred IDE/editor')
    .option('--editor <name>', 'IDE/editor name (e.g., vscode, cursor, windsurf, zed)')
    .addHelpText(
      'after',
      `
Examples:
  $ shep settings ide                    Interactive selection
  $ shep settings ide --editor cursor    Non-interactive`
    )
    .action(async (options: { editor?: string }) => {
      try {
        let editorValue: string;

        if (options.editor !== undefined) {
          editorValue = options.editor;
        } else {
          editorValue = await select(createIdeSelectConfig());
        }

        // PATH check (non-blocking warning)
        const binary = IDE_BINARY_MAP[editorValue];
        if (binary) {
          const found = await checkBinaryInPath(binary);
          if (!found) {
            messages.warning(`'${binary}' not found in PATH. The editor will still be saved.`);
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
