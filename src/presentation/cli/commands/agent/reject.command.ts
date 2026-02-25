/**
 * Agent Reject Command
 *
 * Rejects a paused agent run (waiting_approval) and cancels it.
 *
 * Usage:
 *   shep agent reject <id> [--reason <text>]
 */

import { Command } from 'commander';
import { container } from '@/infrastructure/di/container.js';
import { RejectAgentRunUseCase } from '@/application/use-cases/agents/reject-agent-run.use-case.js';
import { colors, messages } from '../../ui/index.js';
import { resolveAgentRun } from './resolve-run.js';

export function createRejectCommand(): Command {
  return new Command('reject')
    .description('Reject a paused agent run and cancel it')
    .argument('<id>', 'Agent run ID (or prefix)')
    .option('-r, --reason <text>', 'Reason for rejection')
    .action(async (id: string, opts: { reason?: string }) => {
      try {
        const resolved = await resolveAgentRun(id);
        if ('error' in resolved) {
          messages.error(resolved.error);
          process.exitCode = 1;
          return;
        }

        const useCase = container.resolve(RejectAgentRunUseCase);
        const result = await useCase.execute(resolved.run.id, opts.reason ?? 'Rejected by user');

        if (result.rejected) {
          messages.success(
            `Rejected ${colors.accent(resolved.run.id.substring(0, 8))}: ${result.reason}`
          );
        } else {
          messages.error(result.reason);
          process.exitCode = 1;
        }
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        messages.error('Failed to reject agent run', err);
        process.exitCode = 1;
      }
    });
}
