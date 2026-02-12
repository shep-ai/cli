/**
 * Agent Stop Command
 *
 * Sends SIGTERM to a running agent and marks it as cancelled.
 *
 * Usage:
 *   shep agent stop <id>
 */

import { Command } from 'commander';
import { container } from '../../../../infrastructure/di/container.js';
import { StopAgentRunUseCase } from '../../../../application/use-cases/agents/stop-agent-run.use-case.js';
import { colors, messages } from '../../ui/index.js';
import { resolveAgentRun } from './resolve-run.js';

export function createStopCommand(): Command {
  return new Command('stop')
    .description('Stop a running agent')
    .argument('<id>', 'Agent run ID (or prefix)')
    .action(async (id: string) => {
      try {
        const resolved = await resolveAgentRun(id);
        if ('error' in resolved) {
          messages.error(resolved.error);
          process.exitCode = 1;
          return;
        }

        const useCase = container.resolve(StopAgentRunUseCase);
        const result = await useCase.execute(resolved.run.id);

        if (result.stopped) {
          messages.success(
            `Stopped ${colors.accent(resolved.run.id.substring(0, 8))}: ${result.reason}`
          );
        } else {
          messages.error(result.reason);
          process.exitCode = 1;
        }
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        messages.error('Failed to stop agent run', err);
        process.exitCode = 1;
      }
    });
}
