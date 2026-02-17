/**
 * IDE Open Command
 *
 * Opens a feature worktree in the configured IDE.
 *
 * Usage: shep ide <feat-id> [--vscode|--cursor|--windsurf|--zed|--antigravity]
 */

import { Command } from 'commander';
import { EditorType } from '@/domain/generated/output.js';
import { container } from '@/infrastructure/di/container.js';
import { ShowFeatureUseCase } from '@/application/use-cases/features/show-feature.use-case.js';
import { getSettings } from '@/infrastructure/services/settings.service.js';
import { launchIde } from '@/infrastructure/services/ide-launchers/launch-ide.js';
import { messages } from '../ui/index.js';

/** IDE flag names mapped to their EditorType values. */
const IDE_FLAG_MAP: Record<string, EditorType> = {
  vscode: EditorType.VsCode,
  cursor: EditorType.Cursor,
  windsurf: EditorType.Windsurf,
  zed: EditorType.Zed,
  antigravity: EditorType.Antigravity,
};

interface IdeOpenOptions {
  vscode?: boolean;
  cursor?: boolean;
  windsurf?: boolean;
  zed?: boolean;
  antigravity?: boolean;
}

/**
 * Determine which editor to use based on CLI flags and settings.
 * Flag takes precedence over settings.
 */
function resolveEditorId(options: IdeOpenOptions): EditorType {
  for (const [flag, editorType] of Object.entries(IDE_FLAG_MAP)) {
    if (options[flag as keyof IdeOpenOptions]) {
      return editorType;
    }
  }
  return getSettings().environment.defaultEditor;
}

export function createIdeOpenCommand(): Command {
  return new Command('ide')
    .description('Open a feature worktree in your IDE')
    .argument('<feat-id>', 'Feature ID or prefix')
    .option('--vscode', 'Open in VS Code')
    .option('--cursor', 'Open in Cursor')
    .option('--windsurf', 'Open in Windsurf')
    .option('--zed', 'Open in Zed')
    .option('--antigravity', 'Open in Antigravity')
    .action(async (featId: string, options: IdeOpenOptions) => {
      try {
        const editorId = resolveEditorId(options);
        const useCase = container.resolve(ShowFeatureUseCase);
        const feature = await useCase.execute(featId);

        const result = await launchIde({
          editorId,
          repositoryPath: feature.repositoryPath,
          branch: feature.branch,
        });

        if (!result.ok) {
          messages.error(result.message, new Error(result.message));
          process.exitCode = 1;
          return;
        }

        messages.success(`Opened ${result.editorName} at ${result.worktreePath}`);
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        messages.error('Failed to open IDE', err);
        process.exitCode = 1;
      }
    });
}
