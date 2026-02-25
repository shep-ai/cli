/**
 * Feature Retry Command
 *
 * Retries an interrupted or failed feature agent run from the last checkpoint.
 *
 * Usage:
 *   shep feat retry <id>
 */

import { Command } from 'commander';
import { container } from '@/infrastructure/di/container.js';
import { RetryFeatureUseCase } from '@/application/use-cases/features/retry-feature.use-case.js';
import { colors, messages } from '../../ui/index.js';

export function createRetryCommand(): Command {
  return new Command('retry')
    .description('Retry a stopped or failed feature agent from the last checkpoint')
    .argument('<id>', 'Feature ID (or prefix)')
    .action(async (id: string) => {
      try {
        const useCase = container.resolve(RetryFeatureUseCase);
        const { feature, newRun } = await useCase.execute(id);

        messages.newline();
        messages.success('Feature agent retrying from last checkpoint');
        console.log(`  ${colors.muted('Feature:')} ${feature.name}`);
        console.log(`  ${colors.muted('Run ID:')}  ${colors.accent(newRun.id.substring(0, 8))}`);
        messages.newline();
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        messages.error('Failed to retry feature', err);
        process.exitCode = 1;
      }
    });
}
