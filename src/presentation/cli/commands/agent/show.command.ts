/**
 * Agent Show Command
 *
 * Display details of a specific agent run including execution status,
 * PID, current node, heartbeat, and output.
 *
 * Usage:
 *   shep agent show <id>
 */

import { Command } from 'commander';
import { colors, messages, fmt } from '../../ui/index.js';
import type { AgentRun } from '../../../../domain/generated/output.js';
import Table from 'cli-table3';
import { resolveAgentRun } from './resolve-run.js';

function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

export function createShowCommand(): Command {
  return new Command('show')
    .description('Display details of an agent run')
    .argument('<id>', 'Agent run ID (or prefix)')
    .action(async (id: string) => {
      try {
        const resolved = await resolveAgentRun(id);
        if ('error' in resolved) {
          messages.error(resolved.error);
          process.exitCode = 1;
          return;
        }
        const agentRun = resolved.run;

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

        // Check actual process liveness
        const pidAlive =
          agentRun.pid && (agentRun.status === 'running' || agentRun.status === 'pending')
            ? isProcessAlive(agentRun.pid)
            : null;
        const effectiveStatus = getEffectiveStatus(agentRun, pidAlive);

        // Extract current node from result field (format: "node:<name>")
        const currentNode =
          agentRun.status === 'running' && agentRun.result?.startsWith('node:')
            ? agentRun.result.slice(5)
            : null;

        const stuckStatus = getStuckStatus(agentRun);

        table.push(
          ['ID', agentRun.id],
          ['Agent Name', agentRun.agentName],
          ['Agent Type', agentRun.agentType],
          ['Status', effectiveStatus],
          ...(currentNode ? [['Current Node', colors.info(currentNode)]] : []),
          ['PID', formatPid(agentRun, pidAlive)],
          ['Thread ID', agentRun.threadId],
          ['Started At', formatDate(agentRun.startedAt)],
          ['Completed At', formatDate(agentRun.completedAt)],
          ['Duration', getDurationString(agentRun)],
          ['Last Heartbeat', formatDate(agentRun.lastHeartbeat)],
          ['Created At', formatDate(agentRun.createdAt)],
          ['Updated At', formatDate(agentRun.updatedAt)],
          ...(stuckStatus ? [['Warning', stuckStatus]] : [])
        );

        console.log(table.toString());
        messages.newline();

        if (agentRun.prompt) {
          console.log(fmt.heading('Prompt'));
          messages.newline();
          console.log(agentRun.prompt);
          messages.newline();
        }

        // Only show result if it's not just a node tracker
        if (agentRun.result && !agentRun.result.startsWith('node:')) {
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

function getEffectiveStatus(agentRun: AgentRun, pidAlive: boolean | null): string {
  const isActive = agentRun.status === 'running' || agentRun.status === 'pending';
  if (isActive && pidAlive === false) {
    return colors.error('crashed');
  }

  const statusColors: Record<string, string> = {
    pending: colors.muted(agentRun.status),
    running: colors.info(agentRun.status),
    completed: colors.success(agentRun.status),
    failed: colors.error(agentRun.status),
    interrupted: colors.error(agentRun.status),
    cancelled: colors.muted(agentRun.status),
  };
  return statusColors[agentRun.status] || colors.muted(agentRun.status);
}

function formatPid(agentRun: AgentRun, pidAlive: boolean | null): string {
  if (!agentRun.pid) return colors.muted('-');
  const pidStr = colors.info(String(agentRun.pid));
  if (pidAlive === true) return pidStr + colors.success(' (alive)');
  if (pidAlive === false) return pidStr + colors.error(' (dead)');
  return pidStr;
}

function getDurationString(agentRun: AgentRun): string {
  if (agentRun.status === 'pending') {
    const createdTime = new Date(agentRun.createdAt).getTime();
    return formatDuration(Date.now() - createdTime) + colors.error(' (stuck in pending)');
  }

  if (agentRun.startedAt && agentRun.completedAt) {
    const startTime = new Date(agentRun.startedAt).getTime();
    const endTime = new Date(agentRun.completedAt).getTime();
    return formatDuration(endTime - startTime);
  }

  if (agentRun.startedAt) {
    const startTime = new Date(agentRun.startedAt).getTime();
    return formatDuration(Date.now() - startTime) + colors.info(' (running)');
  }

  return '-';
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`;
  if (hours > 0) return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

function getStuckStatus(agentRun: AgentRun): string | null {
  if (agentRun.status === 'pending' && !agentRun.startedAt) {
    const createdTime = new Date(agentRun.createdAt).getTime();
    const durationHours = (Date.now() - createdTime) / (1000 * 60 * 60);

    if (durationHours > 24) {
      return colors.error(
        `STUCK: Pending for ${Math.floor(durationHours)} hours. Check agent logs.`
      );
    }
    if (durationHours > 1) {
      return colors.error(`WARNING: Pending for ${Math.floor(durationHours)} hour(s).`);
    }
  }

  if (agentRun.status === 'running' && agentRun.startedAt) {
    const startTime = new Date(agentRun.startedAt).getTime();
    const durationHours = (Date.now() - startTime) / (1000 * 60 * 60);

    if (durationHours > 24) {
      return colors.error(
        `STUCK: Running for ${Math.floor(durationHours)} hours. Process may have crashed.`
      );
    }
  }

  return null;
}
