/**
 * Agent List Command
 *
 * List all agent runs with their status, PID, and other relevant details.
 * Auto-detects dead PIDs and shows them as "crashed" instead of "running".
 *
 * Usage:
 *   shep agent ls
 */

import { Command } from 'commander';
import { container } from '@/infrastructure/di/container.js';
import { ListAgentRunsUseCase } from '@/application/use-cases/agents/list-agent-runs.use-case.js';
import { colors, symbols, messages, renderListView } from '../../ui/index.js';
import type { AgentRun } from '@/domain/generated/output.js';

function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

export function createLsCommand(): Command {
  return new Command('ls').description('List all agent runs').action(async () => {
    try {
      const useCase = container.resolve(ListAgentRunsUseCase);
      const agentRuns = await useCase.execute();

      const rows = agentRuns.map((run) => {
        const liveness = getLiveness(run);
        return [
          run.id.substring(0, 8),
          run.agentName,
          liveness.displayStatus,
          getDuration(run),
          run.pid ? String(run.pid) : colors.muted('-'),
          liveness.warning || '',
        ];
      });

      renderListView({
        title: 'Agent Runs',
        columns: [
          { label: 'ID', width: 10 },
          { label: 'Agent', width: 18 },
          { label: 'Status', width: 16 },
          { label: 'Duration', width: 10 },
          { label: 'PID', width: 8 },
          { label: 'Warning', width: 20 },
        ],
        rows,
        emptyMessage: 'No agent runs found',
      });
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      messages.error('Failed to list agent runs', err);
      process.exitCode = 1;
    }
  });
}

function getLiveness(run: AgentRun): { displayStatus: string; warning: string } {
  const isActive = run.status === 'running' || run.status === 'pending';

  if (isActive && run.pid && !isProcessAlive(run.pid)) {
    return {
      displayStatus: `${colors.error(symbols.error)} ${colors.error('crashed')}`,
      warning: colors.error(`PID ${run.pid} dead`),
    };
  }

  const map: Record<string, string> = {
    pending: `${colors.muted(symbols.dotEmpty)} ${colors.muted('pending')}`,
    running: `${colors.info(symbols.dot)} ${colors.info('running')}`,
    completed: `${colors.success(symbols.success)} ${colors.success('completed')}`,
    failed: `${colors.error(symbols.error)} ${colors.error('failed')}`,
    interrupted: `${colors.error(symbols.error)} ${colors.error('interrupted')}`,
    cancelled: `${colors.muted(symbols.dotEmpty)} ${colors.muted('cancelled')}`,
  };

  const displayStatus = map[run.status] || colors.muted(run.status);
  let warning = '';

  if (run.status === 'pending' && !run.startedAt) {
    const hours = (Date.now() - new Date(run.createdAt).getTime()) / (1000 * 60 * 60);
    if (hours > 24) warning = colors.error('STUCK (>24h)');
    else if (hours > 1) warning = colors.error('SLOW (>1h)');
  }

  return { displayStatus, warning };
}

function getDuration(run: AgentRun): string {
  if (run.status === 'pending' && !run.startedAt) {
    return fmtDuration(Date.now() - new Date(run.createdAt).getTime());
  }
  if (run.startedAt && run.completedAt) {
    return fmtDuration(new Date(run.completedAt).getTime() - new Date(run.startedAt).getTime());
  }
  if (run.startedAt) {
    return fmtDuration(Date.now() - new Date(run.startedAt).getTime());
  }
  return '-';
}

function fmtDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m`;
  return `${seconds}s`;
}
