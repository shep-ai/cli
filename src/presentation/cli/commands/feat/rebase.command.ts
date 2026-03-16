/**
 * Feature Rebase Command
 *
 * Rebases a feature branch on top of the current main branch.
 * For fork repositories, syncs local main with upstream first.
 * Aborts and surfaces conflicting file names on rebase conflict.
 *
 * Usage:
 *   shep feat rebase <feature-id>
 */

import { Command } from 'commander';
import { container } from '@/infrastructure/di/container.js';
import { RebaseFeatureUseCase } from '@/application/use-cases/features/rebase-feature.use-case.js';
import {
  GitPrError,
  GitPrErrorCode,
} from '@/application/ports/output/services/git-pr-service.interface.js';
import { colors, messages } from '../../ui/index.js';

export function createRebaseCommand(): Command {
  return new Command('rebase')
    .description('Rebase a feature branch on top of the latest main (syncs fork upstream first)')
    .argument('<feature-id>', 'Feature ID (or prefix)')
    .action(async (featureId: string) => {
      try {
        const useCase = container.resolve(RebaseFeatureUseCase);
        const result = await useCase.execute(featureId);

        messages.newline();
        messages.success(`Rebased: ${result.branch}`);
        console.log(`  ${colors.muted('Branch:')}  ${colors.accent(result.branch)}`);
        console.log(`  ${colors.muted('Status:')}  ${colors.success('up to date with main')}`);
        messages.newline();
      } catch (error) {
        if (error instanceof GitPrError && error.code === GitPrErrorCode.REBASE_CONFLICT) {
          messages.newline();
          messages.error('Rebase failed: merge conflicts detected');
          console.error(colors.muted(error.message));
          console.error(colors.muted('Run `git status` in your worktree to see conflict details.'));
          messages.newline();
        } else {
          const err = error instanceof Error ? error : new Error(String(error));
          messages.error('Failed to rebase feature', err);
        }
        process.exitCode = 1;
      }
    });
}
