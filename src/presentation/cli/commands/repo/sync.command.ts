/**
 * Repo Sync Command
 *
 * Syncs the local main branch with the upstream remote for fork repositories.
 * For non-fork repositories, outputs an informational message and exits cleanly.
 *
 * Usage:
 *   shep repo sync
 */

import { Command } from 'commander';
import { container } from '@/infrastructure/di/container.js';
import { SyncForkMainUseCase } from '@/application/use-cases/sync-fork-main.use-case.js';
import { colors, messages } from '../../ui/index.js';

export function createSyncCommand(): Command {
  return new Command('sync')
    .description('Sync fork main branch with upstream remote')
    .action(async () => {
      try {
        const useCase = container.resolve(SyncForkMainUseCase);
        const result = await useCase.execute(process.cwd());

        messages.newline();
        if (!result.synced) {
          messages.info('Repository is not a fork, nothing to sync');
        } else {
          messages.success('Fork main synced with upstream');
          console.log(`  ${colors.muted('Upstream:')} ${colors.accent(result.upstreamUrl ?? '')}`);
          console.log(`  ${colors.muted('Status:')}   ${colors.success('local main up to date')}`);
        }
        messages.newline();
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        messages.error('Failed to sync fork main', err);
        process.exitCode = 1;
      }
    });
}
