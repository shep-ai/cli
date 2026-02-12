/**
 * Agent Approve Command
 *
 * Approves a paused agent run (waiting_approval) and resumes execution.
 *
 * Usage:
 *   shep agent approve <id>
 */

import { Command } from 'commander';
import { container } from '../../../../infrastructure/di/container.js';
import { ApproveAgentRunUseCase } from '../../../../application/use-cases/agents/approve-agent-run.use-case.js';
import { colors, messages } from '../../ui/index.js';
import { resolveAgentRun } from './resolve-run.js';

export function createApproveCommand(): Command {
  return new Command('approve')
    .description('Approve a paused agent run and resume execution')
    .argument('<id>', 'Agent run ID (or prefix)')
    .action(async (id: string) => {
      try {
        const resolved = await resolveAgentRun(id);
        if ('error' in resolved) {
          messages.error(resolved.error);
          process.exitCode = 1;
          return;
        }

        const useCase = container.resolve(ApproveAgentRunUseCase);
        const result = await useCase.execute(resolved.run.id);

        if (result.approved) {
          messages.success(
            `Approved ${colors.accent(resolved.run.id.substring(0, 8))}: ${result.reason}`
          );
        } else {
          messages.error(result.reason);
          process.exitCode = 1;
        }
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        messages.error('Failed to approve agent run', err);
        process.exitCode = 1;
      }
    });
}
