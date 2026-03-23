/**
 * Feature Archive Command
 *
 * Archives a feature to hide it from the canvas without deleting it.
 * Stores the current lifecycle state for restoration on unarchive.
 *
 * Usage: shep feat archive <id> [--force]
 *
 * @example
 * $ shep feat archive feat-123
 * $ shep feat archive feat-123 --force
 */

import { Command } from 'commander';
import { container } from '@/infrastructure/di/container.js';
import { ShowFeatureUseCase } from '@/application/use-cases/features/show-feature.use-case.js';
import { ArchiveFeatureUseCase } from '@/application/use-cases/features/archive-feature.use-case.js';
import { colors, messages } from '../../ui/index.js';
import { confirm } from '@inquirer/prompts';

interface ArchiveOptions {
  force?: boolean;
}

/**
 * Create the feat archive command
 */
export function createArchiveCommand(): Command {
  return new Command('archive')
    .description('Archive a feature to hide it from the canvas')
    .argument('<id>', 'Feature ID or prefix')
    .option('-f, --force', 'Skip confirmation prompt')
    .action(async (featureId: string, options: ArchiveOptions) => {
      try {
        const showUseCase = container.resolve(ShowFeatureUseCase);
        const feature = await showUseCase.execute(featureId);

        if (!options.force) {
          const confirmed = await confirm({
            message: `Archive feature "${feature.name}"?`,
            default: false,
          });
          if (!confirmed) {
            messages.info('Cancelled');
            return;
          }
        }

        const archiveUseCase = container.resolve(ArchiveFeatureUseCase);
        await archiveUseCase.execute(feature.id);

        messages.newline();
        messages.success('Feature archived');
        console.log(`  ${colors.muted('Name:')} ${feature.name}`);
        messages.newline();
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        messages.error('Failed to archive feature', err);
        process.exitCode = 1;
      }
    });
}
