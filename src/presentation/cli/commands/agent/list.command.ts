/**
 * Agent List Command
 *
 * List all agent runs with their status, PID, and other relevant details.
 *
 * Usage:
 *   shep agent list
 *
 * @example
 * $ shep agent list
 */

import { Command } from 'commander';
import { container } from '../../../../infrastructure/di/container.js';
import { ListAgentRunsUseCase } from '../../../../application/use-cases/agents/list-agent-runs.use-case.js';
import { colors, messages, fmt } from '../../ui/index.js';
import Table from 'cli-table3';

/**
 * Create the agent list command
 */
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
        colWidths: [10, 18, 12, 16, 8, 30],
      });

      const formatDate = (date?: string) => {
        if (!date) return '-';
        try {
          return new Date(date).toLocaleString();
        } catch {
          return date;
        }
      };

      agentRuns.forEach((run) => {
        const warnings = getWarnings(run);
        table.push([
          run.id.substring(0, 8),
          run.agentName,
          getStatusColor(run.status),
          getDuration(run),
          run.pid ? colors.info(String(run.pid)) : colors.muted('-'),
          warnings,
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

function getStatusColor(status: string): string {
  const statusColors = {
    pending: colors.muted(status),
    running: colors.info(status),
    completed: colors.success(status),
    failed: colors.error(status),
  } as Record<string, string>;

  return statusColors[status] || colors.muted(status);
}

function getDuration(run: {
  status: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
}): string {
  if (run.status === 'pending' && !run.startedAt) {
    const createdTime = new Date(run.createdAt).getTime();
    const now = Date.now();
    const durationMs = now - createdTime;
    return formatDurationShort(durationMs);
  }

  if (run.startedAt && run.completedAt) {
    const startTime = new Date(run.startedAt).getTime();
    const endTime = new Date(run.completedAt).getTime();
    return formatDurationShort(endTime - startTime);
  }

  if (run.startedAt) {
    const startTime = new Date(run.startedAt).getTime();
    const now = Date.now();
    return formatDurationShort(now - startTime);
  }

  return '-';
}

function formatDurationShort(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days}d ${hours % 24}h`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  }
  if (minutes > 0) {
    return `${minutes}m`;
  }
  return `${seconds}s`;
}

function getWarnings(run: { status: string; createdAt: string; startedAt?: string }): string {
  if (run.status === 'pending' && !run.startedAt) {
    const createdTime = new Date(run.createdAt).getTime();
    const now = Date.now();
    const durationMs = now - createdTime;
    const durationHours = durationMs / (1000 * 60 * 60);

    if (durationHours > 24) {
      return colors.error('⚠️  STUCK (>24h)');
    }
    if (durationHours > 1) {
      return colors.error('⚠️  SLOW (>1h)');
    }
  }

  return '-';
}
