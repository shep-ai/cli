/**
 * Agent Show Command
 *
 * Display details of a specific agent run including execution status, PID, and output.
 *
 * Usage:
 *   shep agent show <id>
 *
 * @example
 * $ shep agent show 123e4567-e89b-12d3-a456-426614174000
 */

import { Command } from 'commander';
import { container } from '../../../../infrastructure/di/container.js';
import { GetAgentRunUseCase } from '../../../../application/use-cases/agents/get-agent-run.use-case.js';
import { ListAgentRunsUseCase } from '../../../../application/use-cases/agents/list-agent-runs.use-case.js';
import { colors, messages, fmt } from '../../ui/index.js';
import type { AgentRun } from '../../../../domain/generated/output.js';
import Table from 'cli-table3';

/**
 * Create the agent show command
 */
export function createShowCommand(): Command {
  return new Command('show')
    .description('Display details of an agent run')
    .argument('<id>', 'Agent run ID')
    .action(async (id: string) => {
      try {
        const getUseCase = container.resolve(GetAgentRunUseCase);
        const listUseCase = container.resolve(ListAgentRunsUseCase);

        // Try exact match first
        let agentRun = await getUseCase.execute(id);

        // If not found, try partial ID match (first 8 chars)
        if (!agentRun && id.length < 36) {
          const allRuns = await listUseCase.execute();
          const matches = allRuns.filter((r) => r.id.startsWith(id));

          if (matches.length === 0) {
            messages.error(`Agent run not found: ${id}`);
            process.exitCode = 1;
            return;
          }
          if (matches.length > 1) {
            messages.error(
              `Multiple agent runs match prefix "${id}". Please provide a longer ID.\n` +
                `Matches: ${matches.map((m) => m.id.substring(0, 8)).join(', ')}`
            );
            process.exitCode = 1;
            return;
          }
          agentRun = matches[0];
        }

        if (!agentRun) {
          messages.error(`Agent run not found: ${id}`);
          process.exitCode = 1;
          return;
        }

        messages.newline();
        console.log(fmt.heading('Agent Run Details'));
        messages.newline();

        const table = new Table({
          head: [colors.accent('Property'), colors.accent('Value')],
          style: { head: [], border: ['cyan'] },
          wordWrap: true,
          colWidths: [20, 60],
        });

        const formatDate = (date?: string) => {
          if (!date) return '-';
          try {
            return new Date(date).toLocaleString();
          } catch {
            return date;
          }
        };

        const stuckStatus = getStuckStatus(agentRun);

        table.push(
          ['ID', agentRun.id],
          ['Agent Name', agentRun.agentName],
          ['Agent Type', agentRun.agentType],
          ['Status', getStatusColor(agentRun.status)],
          ['PID', agentRun.pid ? colors.info(String(agentRun.pid)) : colors.muted('-')],
          ['Thread ID', agentRun.threadId],
          ['Started At', formatDate(agentRun.startedAt)],
          ['Completed At', formatDate(agentRun.completedAt)],
          ['Duration', getDurationString(agentRun)],
          ['Created At', formatDate(agentRun.createdAt)],
          ['Updated At', formatDate(agentRun.updatedAt)],
          ...(stuckStatus ? [['⚠️  Status', stuckStatus]] : [])
        );

        console.log(table.toString());
        messages.newline();

        if (agentRun.prompt) {
          console.log(fmt.heading('Prompt'));
          messages.newline();
          console.log(agentRun.prompt);
          messages.newline();
        }

        if (agentRun.result) {
          console.log(fmt.heading('Result'));
          messages.newline();
          console.log(agentRun.result);
          messages.newline();
        }

        if (agentRun.error) {
          console.log(fmt.heading('Error'));
          messages.newline();
          console.log(colors.error(agentRun.error));
          messages.newline();
        }
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        messages.error('Failed to show agent run', err);
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

function getDurationString(agentRun: AgentRun): string {
  if (agentRun.status === 'pending') {
    // If pending and no startedAt, calculate time since creation
    const createdTime = new Date(agentRun.createdAt).getTime();
    const now = Date.now();
    const durationMs = now - createdTime;
    return formatDuration(durationMs) + colors.error(' (stuck in pending)');
  }

  if (agentRun.startedAt && agentRun.completedAt) {
    const startTime = new Date(agentRun.startedAt).getTime();
    const endTime = new Date(agentRun.completedAt).getTime();
    return formatDuration(endTime - startTime);
  }

  if (agentRun.startedAt) {
    const startTime = new Date(agentRun.startedAt).getTime();
    const now = Date.now();
    return formatDuration(now - startTime) + colors.info(' (running)');
  }

  return '-';
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days}d ${hours % 24}h ${minutes % 60}m`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
}

function getStuckStatus(agentRun: AgentRun): string | null {
  if (agentRun.status === 'pending' && !agentRun.startedAt) {
    const createdTime = new Date(agentRun.createdAt).getTime();
    const now = Date.now();
    const durationMs = now - createdTime;
    const durationHours = durationMs / (1000 * 60 * 60);

    if (durationHours > 24) {
      return colors.error(
        `STUCK: Pending for ${Math.floor(durationHours)} hours. Never started execution. ` +
          'Check agent logs for errors.'
      );
    }

    if (durationHours > 1) {
      return colors.error(
        `WARNING: Pending for ${Math.floor(durationHours)} hour(s). ` +
          'Should have started by now.'
      );
    }
  }

  if (agentRun.status === 'running' && agentRun.startedAt) {
    const startTime = new Date(agentRun.startedAt).getTime();
    const now = Date.now();
    const durationMs = now - startTime;
    const durationHours = durationMs / (1000 * 60 * 60);

    if (durationHours > 24) {
      return colors.error(
        `STUCK: Running for ${Math.floor(durationHours)} hours. ` +
          `Process may have crashed. Check PID: ${agentRun.pid ? String(agentRun.pid) : 'unknown'}`
      );
    }
  }

  return null;
}
