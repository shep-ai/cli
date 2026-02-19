/**
 * Agent Delete Command
 *
 * Remove an agent run record from the database.
 *
 * Usage:
 *   shep agent delete <id>
 */

import { Command } from 'commander';
import { container } from '@/infrastructure/di/container.js';
import { DeleteAgentRunUseCase } from '@/application/use-cases/agents/delete-agent-run.use-case.js';
import { colors, messages } from '../../ui/index.js';
import { resolveAgentRun } from './resolve-run.js';

export function createDeleteCommand(): Command {
  return new Command('delete')
    .description('Delete an agent run record')
    .argument('<id>', 'Agent run ID (or prefix)')
    .option('--force', 'Force delete even if running')
    .action(async (id: string, opts: { force?: boolean }) => {
      try {
        const resolved = await resolveAgentRun(id);
        if ('error' in resolved) {
          messages.error(resolved.error);
          process.exitCode = 1;
          return;
        }

        if (opts.force && resolved.run.status === 'running') {
          // Force delete: stop first, then delete
          const { StopAgentRunUseCase } =
            await import('@/application/use-cases/agents/stop-agent-run.use-case.js');
          const stopUseCase = container.resolve(StopAgentRunUseCase);
          await stopUseCase.execute(resolved.run.id);
        }

        const useCase = container.resolve(DeleteAgentRunUseCase);
        const result = await useCase.execute(resolved.run.id);

        if (result.deleted) {
          messages.success(`Deleted ${colors.accent(resolved.run.id.substring(0, 8))}`);
        } else {
          messages.error(result.reason);
          process.exitCode = 1;
        }
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        messages.error('Failed to delete agent run', err);
        process.exitCode = 1;
      }
    });
}
