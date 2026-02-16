/**
 * IDE Open Command
 *
 * Opens a feature worktree in the configured IDE.
 *
 * Usage: shep ide <feat-id> [--vscode|--cursor|--windsurf|--zed|--antigravity]
 */

import { Command } from 'commander';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { EditorType } from '@/domain/generated/output.js';
import { container } from '@/infrastructure/di/container.js';
import { ShowFeatureUseCase } from '@/application/use-cases/features/show-feature.use-case.js';
import { getSettings } from '@/infrastructure/services/settings.service.js';
import { createLauncherRegistry } from '@/infrastructure/services/ide-launchers/ide-launcher.registry.js';
import { SHEP_HOME_DIR } from '@/infrastructure/services/filesystem/shep-directory.service.js';
import { messages } from '../ui/index.js';

function computeWorktreePath(repoPath: string, branch: string): string {
  const repoHash = createHash('sha256').update(repoPath).digest('hex').slice(0, 16);
  const slug = branch.replace(/\//g, '-');
  return join(SHEP_HOME_DIR, 'repos', repoHash, 'wt', slug);
}

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
        // Resolve the editor
        const editorId = resolveEditorId(options);
        const registry = createLauncherRegistry();
        const launcher = registry.get(editorId);

        if (!launcher) {
          messages.error(
            `Unknown editor "${editorId}". Supported: ${[...registry.keys()].join(', ')}`,
            new Error(`Unknown editor: ${editorId}`)
          );
          process.exitCode = 1;
          return;
        }

        // Resolve the feature
        const useCase = container.resolve(ShowFeatureUseCase);
        const feature = await useCase.execute(featId);

        // Compute worktree path and launch
        const worktreePath = computeWorktreePath(feature.repositoryPath, feature.branch);
        await launcher.launch(worktreePath);

        messages.success(`Opened ${launcher.name} at ${worktreePath}`);
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        messages.error('Failed to open IDE', err);
        process.exitCode = 1;
      }
    });
}
