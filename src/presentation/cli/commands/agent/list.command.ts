/**
 * Agent List Command
 *
 * List all agent runs with their status, PID, and other relevant details.
 * Auto-detects dead PIDs and shows them as "crashed" instead of "running".
 *
 * Usage:
 *   shep agent list
 */

import { Command } from 'commander';
import { container } from '../../../../infrastructure/di/container.js';
import { ListAgentRunsUseCase } from '../../../../application/use-cases/agents/list-agent-runs.use-case.js';
import { colors, messages, fmt } from '../../ui/index.js';
import type { AgentRun } from '../../../../domain/generated/output.js';
import Table from 'cli-table3';

function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

export function createListCommand(): Command {
  return new Command('list').description('List all agent runs').action(async () => {
    try {
      const useCase = container.resolve(ListAgentRunsUseCase);
      const agentRuns = await useCase.execute();

      if (agentRuns.length === 0) {
        messages.newline();
        messages.info('No agent runs found');
        messages.newline();
        return;
      }

      messages.newline();
      console.log(fmt.heading('Agent Runs'));
      messages.newline();

      const table = new Table({
        head: [
          colors.accent('ID (first 8)'),
          colors.accent('Agent'),
          colors.accent('Status'),
          colors.accent('Duration'),
          colors.accent('PID'),
          colors.accent('Warnings'),
        ],
        style: { head: [], border: ['cyan'] },
        wordWrap: true,
        colWidths: [10, 18, 14, 16, 8, 30],
      });

      agentRuns.forEach((run) => {
        const liveness = getLiveness(run);
        table.push([
          run.id.substring(0, 8),
          run.agentName,
          liveness.displayStatus,
          getDuration(run),
          run.pid ? colors.info(String(run.pid)) : colors.muted('-'),
          liveness.warning,
        ]);
      });

      console.log(table.toString());
      messages.newline();
      console.log(`Total: ${colors.accent(String(agentRuns.length))} agent run(s)`);
      messages.newline();
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      messages.error('Failed to list agent runs', err);
      process.exitCode = 1;
    }
  });
}

function getLiveness(run: AgentRun): { displayStatus: string; warning: string } {
  const isActive = run.status === 'running' || run.status === 'pending';

  // Check if a "running" process is actually dead
  if (isActive && run.pid) {
    if (!isProcessAlive(run.pid)) {
      return {
        displayStatus: colors.error('crashed'),
        warning: colors.error(`PID ${run.pid} dead`),
      };
    }
  }

  // Status color mapping
  const statusColors: Record<string, string> = {
    pending: colors.muted(run.status),
    running: colors.info(run.status),
    completed: colors.success(run.status),
    failed: colors.error(run.status),
    interrupted: colors.error(run.status),
    cancelled: colors.muted(run.status),
  };

  const displayStatus = statusColors[run.status] || colors.muted(run.status);
  let warning = '-';

  if (run.status === 'pending' && !run.startedAt) {
    const createdTime = new Date(run.createdAt).getTime();
    const durationHours = (Date.now() - createdTime) / (1000 * 60 * 60);

    if (durationHours > 24) {
      warning = colors.error('STUCK (>24h)');
    } else if (durationHours > 1) {
      warning = colors.error('SLOW (>1h)');
    }
  }

  return { displayStatus, warning };
}

function getDuration(run: {
  status: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
}): string {
  if (run.status === 'pending' && !run.startedAt) {
    const createdTime = new Date(run.createdAt).getTime();
    return formatDurationShort(Date.now() - createdTime);
  }

  if (run.startedAt && run.completedAt) {
    const startTime = new Date(run.startedAt).getTime();
    const endTime = new Date(run.completedAt).getTime();
    return formatDurationShort(endTime - startTime);
  }

  if (run.startedAt) {
    const startTime = new Date(run.startedAt).getTime();
    return formatDurationShort(Date.now() - startTime);
  }

  return '-';
}

function formatDurationShort(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m`;
  return `${seconds}s`;
}
