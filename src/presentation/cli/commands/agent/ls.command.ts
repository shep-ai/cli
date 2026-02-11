/**
 * Agent Run List Command
 *
 * Lists agent runs in a formatted table.
 *
 * Usage: shep agent ls
 *
 * @example
 * $ shep agent ls
 */

import { Command } from 'commander';
import { container } from '../../../../infrastructure/di/container.js';
import { ListAgentRunsUseCase } from '../../../../application/use-cases/agents/list-agent-runs.use-case.js';
import { colors, fmt, messages } from '../../ui/index.js';
import type { AgentRunStatus } from '../../../../domain/generated/output.js';

/**
 * Format agent run status with color
 */
function formatStatus(status: AgentRunStatus): string {
  switch (status) {
    case 'running':
      return colors.info(status);
    case 'completed':
      return colors.success(status);
    case 'pending':
      return colors.warning(status);
    case 'failed':
      return colors.error(status);
    case 'interrupted':
      return colors.error(status);
    case 'cancelled':
      return colors.muted(status);
    default:
      return status;
  }
}

/**
 * Create the agent ls command
 */
export function createLsCommand(): Command {
  return new Command('ls').description('List agent runs').action(async () => {
    try {
      const useCase = container.resolve(ListAgentRunsUseCase);
      const runs = await useCase.execute();

      if (runs.length === 0) {
        messages.newline();
        messages.info('No agent runs found');
        messages.newline();
        return;
      }

      messages.newline();
      console.log(fmt.heading(`Agent Runs (${runs.length})`));
      messages.newline();

      for (const run of runs) {
        const started = run.startedAt
          ? run.startedAt instanceof Date
            ? run.startedAt.toLocaleString()
            : String(run.startedAt)
          : colors.muted('not started');

        const featureId = run.featureId ? run.featureId.slice(0, 8) : colors.muted('n/a');

        console.log(
          `  ${colors.accent(run.id.slice(0, 8))}  ${run.agentName}  ${formatStatus(run.status)}  ${featureId}  ${colors.muted(started)}`
        );
      }

      messages.newline();
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      messages.error('Failed to list agent runs', err);
      process.exitCode = 1;
    }
  });
}
