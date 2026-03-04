/**
 * Feature Delete Command
 *
 * Deletes a feature, its worktree, and cancels any running agent.
 * Optionally cleans up worktree and branches (local + remote).
 *
 * Usage: shep feat del <id> [--force] [--no-cleanup]
 *
 * @example
 * $ shep feat del feat-123
 * $ shep feat del feat-123 --force
 * $ shep feat del feat-123 --force --no-cleanup
 */

import { Command } from 'commander';
import { container } from '@/infrastructure/di/container.js';
import { DeleteFeatureUseCase } from '@/application/use-cases/features/delete-feature.use-case.js';
import { ShowFeatureUseCase } from '@/application/use-cases/features/show-feature.use-case.js';
import { colors, messages } from '../../ui/index.js';
import { confirm } from '@inquirer/prompts';

interface DelOptions {
  force?: boolean;
  cleanup?: boolean;
}

/**
 * Create the feat del command
 */
export function createDelCommand(): Command {
  return new Command('del')
    .description('Delete a feature')
    .argument('<id>', 'Feature ID or prefix')
    .option('-f, --force', 'Skip confirmation prompt')
    .option('--no-cleanup', 'Skip worktree and branch cleanup')
    .action(async (featureId: string, options: DelOptions) => {
      try {
        // First show what we're about to delete
        const showUseCase = container.resolve(ShowFeatureUseCase);
        const feature = await showUseCase.execute(featureId);

        if (!options.force) {
          const confirmed = await confirm({
            message: `Delete feature "${feature.name}"?`,
            default: false,
          });
          if (!confirmed) {
            messages.info('Cancelled');
            return;
          }
        }

        // Determine cleanup preference
        let cleanup = true;
        if (options.cleanup === false) {
          cleanup = false;
        } else if (!options.force) {
          cleanup = await confirm({
            message: 'Also clean up worktree and branches?',
            default: true,
          });
        }

        const deleteUseCase = container.resolve(DeleteFeatureUseCase);
        await deleteUseCase.execute(feature.id, { cleanup });

        messages.newline();
        messages.success('Feature deleted');
        console.log(`  ${colors.muted('Name:')}   ${feature.name}`);
        console.log(`  ${colors.muted('Branch:')} ${feature.branch}`);
        if (cleanup) {
          console.log(`  ${colors.muted('Cleanup:')} worktree, local branch, remote branch`);
        }
        messages.newline();
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        messages.error('Failed to delete feature', err);
        process.exitCode = 1;
      }
    });
}
