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

import { Command } from 'commander';
import { container } from '../../../../infrastructure/di/container.js';
import { ListFeaturesUseCase } from '../../../../application/use-cases/features/list-features.use-case.js';
import type { IAgentRunRepository } from '../../../../application/ports/output/agent-run-repository.interface.js';
import type { Feature, AgentRun } from '../../../../domain/generated/output.js';
import { colors, symbols, messages, renderListView } from '../../ui/index.js';

interface LsOptions {
  repo?: string;
}

/** Map graph node names to human-readable phase labels. */
const NODE_TO_PHASE: Record<string, string> = {
  analyze: 'Analyzing',
  requirements: 'Requirements',
  research: 'Researching',
  plan: 'Planning',
  implement: 'Implementing',
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
  const phase = run.result?.startsWith('node:')
    ? (NODE_TO_PHASE[run.result.slice(5)] ?? run.result.slice(5))
    : feature.lifecycle;

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
    return `${colors.warning(symbols.warning)} ${colors.warning(phase)}`;
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
          const updated =
            feature.updatedAt instanceof Date
              ? feature.updatedAt.toLocaleDateString()
              : String(feature.updatedAt);

          return [
            feature.id.slice(0, 8),
            feature.name.slice(0, 30),
            formatStatus(feature, run),
            colors.muted(feature.branch),
            colors.muted(updated),
          ];
        });

        renderListView({
          title: 'Features',
          columns: [
            { label: 'ID', width: 10 },
            { label: 'Name', width: 32 },
            { label: 'Status', width: 20 },
            { label: 'Branch', width: 28 },
            { label: 'Updated', width: 12 },
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
