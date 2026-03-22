/**
 * Feature Unarchive Command
 *
 * Restores an archived feature to its previous lifecycle state.
 * No confirmation needed — unarchive is always safe and non-destructive.
 *
 * Usage: shep feat unarchive <id>
 *
 * @example
 * $ shep feat unarchive feat-123
 */

import { Command } from 'commander';
import { container } from '@/infrastructure/di/container.js';
import { ShowFeatureUseCase } from '@/application/use-cases/features/show-feature.use-case.js';
import { UnarchiveFeatureUseCase } from '@/application/use-cases/features/unarchive-feature.use-case.js';
import { colors, messages } from '../../ui/index.js';

/**
 * Create the feat unarchive command
 */
export function createUnarchiveCommand(): Command {
  return new Command('unarchive')
    .description('Restore an archived feature to its previous state')
    .argument('<id>', 'Feature ID or prefix')
    .action(async (featureId: string) => {
      try {
        const showUseCase = container.resolve(ShowFeatureUseCase);
        const feature = await showUseCase.execute(featureId);

        const unarchiveUseCase = container.resolve(UnarchiveFeatureUseCase);
        const restored = await unarchiveUseCase.execute(feature.id);

        messages.newline();
        messages.success('Feature unarchived');
        console.log(`  ${colors.muted('Name:')}     ${feature.name}`);
        console.log(`  ${colors.muted('Restored:')} ${restored.lifecycle}`);
        messages.newline();
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        messages.error('Failed to unarchive feature', err);
        process.exitCode = 1;
      }
    });
}
