/**
 * Feature List Command
 *
 * Lists features in a formatted list with optional filtering.
 *
 * Usage: shep feat ls [options]
 *
 * @example
 * $ shep feat ls
 * $ shep feat ls --repo /path/to/project
 */

import { Command } from 'commander';
import { container } from '../../../../infrastructure/di/container.js';
import { ListFeaturesUseCase } from '../../../../application/use-cases/features/list-features.use-case.js';
import { colors, fmt, messages } from '../../ui/index.js';

interface LsOptions {
  repo?: string;
}

/**
 * Format lifecycle status with color
 */
function formatLifecycle(lifecycle: string): string {
  switch (lifecycle) {
    case 'Requirements':
      return colors.info(lifecycle);
    case 'Research':
      return colors.accent(lifecycle);
    case 'Implementation':
      return colors.warning(lifecycle);
    case 'Review':
      return colors.info(lifecycle);
    case 'Deploy & QA':
      return colors.success(lifecycle);
    case 'Maintain':
      return colors.muted(lifecycle);
    default:
      return lifecycle;
  }
}

/**
 * Create the feat ls command
 */
export function createLsCommand(): Command {
  return new Command('ls')
    .description('List features')
    .option('-r, --repo <path>', 'Filter by repository path')
    .action(async (options: LsOptions) => {
      try {
        const useCase = container.resolve(ListFeaturesUseCase);

        const filters = options.repo ? { repositoryPath: options.repo } : undefined;
        const features = await useCase.execute(filters);

        if (features.length === 0) {
          messages.newline();
          messages.info('No features found');
          messages.newline();
          return;
        }

        messages.newline();
        console.log(fmt.heading(`Features (${features.length})`));
        messages.newline();

        for (const feature of features) {
          const updated =
            feature.updatedAt instanceof Date
              ? feature.updatedAt.toLocaleDateString()
              : String(feature.updatedAt);

          console.log(`  ${colors.accent(feature.id.slice(0, 8))}  ${feature.name.slice(0, 40)}`);
          console.log(
            `    ${formatLifecycle(feature.lifecycle)}  ${colors.muted(feature.branch)}  ${colors.muted(updated)}`
          );
        }

        messages.newline();
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        messages.error('Failed to list features', err);
        process.exitCode = 1;
      }
    });
}
