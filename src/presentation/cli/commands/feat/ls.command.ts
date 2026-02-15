/**
 * Feature List Command
 *
 * Lists features in a formatted list with optional filtering.
 * Derives real-time status from the agent run (not stale Feature.lifecycle).
 *
 * Usage: shep feat ls [options]
 *
 * @example
 * $ shep feat ls
 * $ shep feat ls --repo /path/to/project
 */

import path from 'node:path';
import { Command } from 'commander';
import { container } from '../../../../infrastructure/di/container.js';
import { ListFeaturesUseCase } from '../../../../application/use-cases/features/list-features.use-case.js';
import type { IAgentRunRepository } from '../../../../application/ports/output/agents/agent-run-repository.interface.js';
import type { Feature, AgentRun } from '../../../../domain/generated/output.js';
import { colors, symbols, messages, renderListView } from '../../ui/index.js';

interface LsOptions {
  repo?: string;
}

/** Map graph node names to human-readable phase labels (active). */
const NODE_TO_PHASE: Record<string, string> = {
  analyze: 'Analyzing',
  requirements: 'Requirements',
  research: 'Researching',
  plan: 'Planning',
  implement: 'Implementing',
};

/** Map graph node names to approval action labels. */
const NODE_TO_APPROVE: Record<string, string> = {
  analyze: 'Approve Analysis',
  requirements: 'Approve PRD',
  research: 'Approve Research',
  plan: 'Approve Plan',
  implement: 'Approve Merge',
};

/**
 * Derive the display status from the agent run.
 * Returns the current graph node as a phase label with an activity indicator.
 */
function formatStatus(feature: Feature, run: AgentRun | null): string {
  if (!run) {
    // No agent run — fall back to static lifecycle
    return `${colors.muted(symbols.dotEmpty)} ${colors.muted(feature.lifecycle)}`;
  }

  const isRunning = run.status === 'running' || run.status === 'pending';
  const nodeName = run.result?.startsWith('node:') ? run.result.slice(5) : undefined;
  const phase = nodeName ? (NODE_TO_PHASE[nodeName] ?? nodeName) : feature.lifecycle;

  if (isRunning) {
    // Check PID liveness for running agents
    if (run.pid && !isProcessAlive(run.pid)) {
      return `${colors.error(symbols.error)} ${colors.error('crashed')}`;
    }
    return `${colors.info(symbols.spinner[0])} ${colors.info(phase)}`;
  }

  if (run.status === 'completed') {
    return `${colors.success(symbols.success)} ${colors.success('Completed')}`;
  }
  if (run.status === 'failed') {
    return `${colors.error(symbols.error)} ${colors.error('Failed')}`;
  }
  if (run.status === 'waiting_approval') {
    const action = nodeName ? (NODE_TO_APPROVE[nodeName] ?? phase) : phase;
    return `${colors.warning(symbols.warning)} ${colors.warning(action)}`;
  }
  if (run.status === 'interrupted') {
    return `${colors.error(symbols.error)} ${colors.error('Interrupted')}`;
  }

  return `${colors.muted(symbols.dotEmpty)} ${colors.muted(phase)}`;
}

function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

/** Format a duration in ms to a compact human-readable string. */
function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remMin = minutes % 60;
  if (hours < 24) return remMin > 0 ? `${hours}h ${remMin}m` : `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

/** Format the time column based on run status. */
function formatTime(feature: Feature, run: AgentRun | null): string {
  const now = Date.now();

  if (run) {
    const isRunning = run.status === 'running' || run.status === 'pending';
    if (isRunning && run.startedAt) {
      const started = new Date(run.startedAt).getTime();
      return colors.info(formatDuration(now - started));
    }
    if (run.status === 'completed' && run.completedAt) {
      const completed = new Date(run.completedAt).getTime();
      return colors.muted(`${formatDuration(now - completed)} ago`);
    }
  }

  // Fallback to updatedAt
  const updated = new Date(feature.updatedAt).getTime();
  return colors.muted(`${formatDuration(now - updated)} ago`);
}

export function createLsCommand(): Command {
  return new Command('ls')
    .description('List features')
    .option('-r, --repo <path>', 'Filter by repository path')
    .action(async (options: LsOptions) => {
      try {
        const useCase = container.resolve(ListFeaturesUseCase);
        const runRepo = container.resolve<IAgentRunRepository>('IAgentRunRepository');

        const filters = options.repo ? { repositoryPath: options.repo } : undefined;
        const features = await useCase.execute(filters);

        // Load agent runs for all features in parallel
        const runs = await Promise.all(
          features.map((f) =>
            f.agentRunId ? runRepo.findById(f.agentRunId) : Promise.resolve(null)
          )
        );

        const rows = features.map((feature, i) => {
          const run = runs[i];
          const repo = path.basename(feature.repositoryPath);
          const agent = run?.agentType ?? colors.muted('—');

          return [
            feature.id.slice(0, 8),
            feature.name.slice(0, 30),
            formatStatus(feature, run),
            colors.muted(repo),
            agent,
            formatTime(feature, run),
          ];
        });

        renderListView({
          title: 'Features',
          columns: [
            { label: 'ID', width: 10 },
            { label: 'Name', width: 32 },
            { label: 'Status', width: 20 },
            { label: 'Repo', width: 20 },
            { label: 'Agent', width: 14 },
            { label: 'Time', width: 12 },
          ],
          rows,
          emptyMessage: 'No features found',
        });
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        messages.error('Failed to list features', err);
        process.exitCode = 1;
      }
    });
}
