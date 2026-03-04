/**
 * Feature Rebase Command
 *
 * Batch-updates all feature branches with the latest remote default branch.
 * Supports merge (default) and rebase strategies, lifecycle filtering,
 * and targeting specific features by ID.
 *
 * Usage:
 *   shep feat rebase                          # Merge main into all features
 *   shep feat rebase --strategy rebase        # Rebase all features onto main
 *   shep feat rebase --lifecycle Implementation  # Only Implementation features
 *   shep feat rebase abc123 def456            # Target specific features
 */

import { Command } from 'commander';
import { container } from '@/infrastructure/di/container.js';
import { BatchRebaseFeaturesUseCase } from '@/application/use-cases/features/batch-rebase-features.use-case.js';
import type { BatchRebaseResult } from '@/application/use-cases/features/batch-rebase-features.use-case.js';
import type { SdlcLifecycle } from '@/domain/generated/output.js';
import { colors, messages, renderListView } from '../../ui/index.js';

interface RebaseOptions {
  strategy: 'merge' | 'rebase';
  lifecycle?: string;
}

function formatStatus(status: BatchRebaseResult['status']): string {
  switch (status) {
    case 'success':
      return colors.success('success');
    case 'skipped':
      return colors.warning('skipped');
    case 'failed':
      return colors.error('failed');
  }
}

export function createRebaseCommand(): Command {
  return new Command('rebase')
    .description('Batch-update feature branches with latest remote default branch')
    .option('-s, --strategy <strategy>', 'Update strategy: merge or rebase', 'merge')
    .option('-l, --lifecycle <phase>', 'Filter features by SDLC lifecycle phase')
    .argument('[featureIds...]', 'Specific feature IDs to target')
    .action(async (featureIds: string[], options: RebaseOptions) => {
      try {
        const useCase = container.resolve(BatchRebaseFeaturesUseCase);

        const results = await useCase.execute({
          repositoryPath: process.cwd(),
          strategy: options.strategy,
          lifecycle: options.lifecycle as SdlcLifecycle | undefined,
          featureIds: featureIds.length > 0 ? featureIds : undefined,
          onProgress: ({ index, total, name }) => {
            messages.info(`Processing feature ${index + 1}/${total}: ${name}...`);
          },
        });

        // Render results table
        const rows = results.map((r) => [
          r.featureName,
          r.branch,
          formatStatus(r.status),
          r.reason ?? '',
        ]);

        renderListView({
          title: 'Rebase Results',
          columns: [
            { label: 'Feature', width: 30 },
            { label: 'Branch', width: 30 },
            { label: 'Status', width: 12 },
            { label: 'Reason', width: 24 },
          ],
          rows,
          emptyMessage: 'No features found to update',
        });

        // Aggregate summary
        const succeeded = results.filter((r) => r.status === 'success').length;
        const skipped = results.filter((r) => r.status === 'skipped').length;
        const failed = results.filter((r) => r.status === 'failed').length;

        messages.log(
          `  ${colors.success(`${succeeded} succeeded`)}, ${colors.warning(`${skipped} skipped`)}, ${colors.error(`${failed} failed`)}`
        );
        messages.newline();

        if (failed > 0) {
          process.exitCode = 1;
        }
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        messages.error('Failed to rebase features', err);
        process.exitCode = 1;
      }
    });
}
