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
import { container } from '@/infrastructure/di/container.js';
import { ListFeaturesUseCase } from '@/application/use-cases/features/list-features.use-case.js';
import type { IAgentRunRepository } from '@/application/ports/output/agents/agent-run-repository.interface.js';
import type { IPhaseTimingRepository } from '@/application/ports/output/agents/phase-timing-repository.interface.js';
import type { Feature, AgentRun, PhaseTiming } from '@/domain/generated/output.js';
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

/** Map graph node names to review action labels. */
const NODE_TO_REVIEW: Record<string, string> = {
  analyze: 'Review Analysis',
  requirements: 'Review Requirements',
  research: 'Review Research',
  plan: 'Review Plan',
  implement: 'Review Merge',
  merge: 'Review Merge',
};

/** Status priority for sorting (lower = higher priority). */
const STATUS_PRIORITY: Record<string, number> = {
  running: 0,
  pending: 0,
  waiting_approval: 1,
  failed: 2,
  interrupted: 2,
  completed: 3,
};

/**
 * Derive the display status from the agent run.
 * Returns the current graph node as a phase label with an activity indicator.
 */
function formatStatus(feature: Feature, run: AgentRun | null): string {
  // Blocked features show "Waiting" — the parent relationship is conveyed by tree indentation
  if (feature.lifecycle === 'Blocked') {
    return `${colors.warning(symbols.dotEmpty)} ${colors.warning('Blocked')}`;
  }

  if (!run) {
    return `${colors.muted(symbols.dotEmpty)} ${colors.muted(feature.lifecycle)}`;
  }

  const isRunning = run.status === 'running' || run.status === 'pending';
  const nodeName = run.result?.startsWith('node:') ? run.result.slice(5) : undefined;
  const phase = nodeName ? (NODE_TO_PHASE[nodeName] ?? nodeName) : feature.lifecycle;

  if (isRunning) {
    if (run.pid && !isProcessAlive(run.pid)) {
      return `${colors.error(symbols.error)} ${colors.error('Crashed')}`;
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
    const action = nodeName ? (NODE_TO_REVIEW[nodeName] ?? phase) : phase;
    return `${colors.brand(symbols.pointer)} ${colors.brand(action)}`;
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

/** Truncate a string to maxLen, appending ellipsis if needed. */
function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen - 1) + symbols.ellipsis;
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

/** Compute total elapsed from phase timings (sum of all phases, including live delta). */
function formatElapsed(run: AgentRun | null, phaseTimings: PhaseTiming[]): string {
  if (phaseTimings.length > 0) {
    const now = Date.now();
    const totalMs = phaseTimings.reduce((sum, pt) => {
      if (pt.durationMs != null) return sum + Number(pt.durationMs);
      // Phase still running — add live delta
      if (pt.startedAt) return sum + (now - new Date(pt.startedAt).getTime());
      return sum;
    }, 0);

    const isRunning = run?.status === 'running' || run?.status === 'pending';
    return isRunning ? colors.info(formatDuration(totalMs)) : colors.muted(formatDuration(totalMs));
  }

  // Fallback to run timestamps if no phase timings
  if (!run?.startedAt) return '';
  const started = new Date(run.startedAt).getTime();
  const isRunning = run.status === 'running' || run.status === 'pending';
  const end = isRunning
    ? Date.now()
    : run.completedAt
      ? new Date(run.completedAt).getTime()
      : Date.now();

  return isRunning
    ? colors.info(formatDuration(end - started))
    : colors.muted(formatDuration(end - started));
}

/** Format when the feature finished (only for completed runs). */
function formatDone(run: AgentRun | null): string {
  if (!run?.completedAt || run.status !== 'completed') return '';

  const completed = new Date(run.completedAt).getTime();
  return colors.muted(`${formatDuration(Date.now() - completed)} ago`);
}

/** Format approval gates and push flag as compact checkboxes: R P M ↑ */
function formatGates(feature: Feature): string {
  const { allowPrd, allowPlan, allowMerge } = feature.approvalGates;
  const gate = (on: boolean) => (on ? colors.success('■') : colors.muted('□'));
  const push = feature.push ? colors.accent('■') : colors.muted('□');
  return `${gate(allowPrd)} ${gate(allowPlan)} ${gate(allowMerge)} ${push}`;
}

/** Get sort priority for a run status (lower = shown first). */
function getStatusPriority(run: AgentRun | null): number {
  if (!run) return 4;
  return STATUS_PRIORITY[run.status] ?? 4;
}

export function createLsCommand(): Command {
  return new Command('ls')
    .description('List features')
    .option('-r, --repo <path>', 'Filter by repository path')
    .action(async (options: LsOptions) => {
      try {
        const useCase = container.resolve(ListFeaturesUseCase);
        const runRepo = container.resolve<IAgentRunRepository>('IAgentRunRepository');
        const phaseRepo = container.resolve<IPhaseTimingRepository>('IPhaseTimingRepository');

        const filters = options.repo ? { repositoryPath: options.repo } : undefined;
        const features = await useCase.execute(filters);

        // Load agent runs and phase timings for all features in parallel
        const [runs, timings] = await Promise.all([
          Promise.all(
            features.map((f) =>
              f.agentRunId ? runRepo.findById(f.agentRunId) : Promise.resolve(null)
            )
          ),
          Promise.all(features.map((f) => phaseRepo.findByFeatureId(f.id))),
        ]);

        // Pair features with runs/timings and sort by status priority
        const paired = features
          .map((feature, i) => ({ feature, run: runs[i], phases: timings[i] }))
          .sort((a, b) => getStatusPriority(a.run) - getStatusPriority(b.run));

        // Build tree: group blocked children under their parent
        type Entry = (typeof paired)[number];
        const childrenByParent = new Map<string, Entry[]>();
        const roots: Entry[] = [];
        for (const entry of paired) {
          const pid = entry.feature.parentId;
          if (pid && entry.feature.lifecycle === 'Blocked') {
            const list = childrenByParent.get(pid) ?? [];
            list.push(entry);
            childrenByParent.set(pid, list);
          } else {
            roots.push(entry);
          }
        }
        // Flatten: parent then its blocked children
        const ordered: { entry: Entry; indent: boolean }[] = [];
        for (const entry of roots) {
          ordered.push({ entry, indent: false });
          const kids = childrenByParent.get(entry.feature.id);
          if (kids) {
            for (const kid of kids) {
              ordered.push({ entry: kid, indent: true });
            }
            childrenByParent.delete(entry.feature.id);
          }
        }
        // Append orphaned blocked children (parent not in current list)
        for (const kids of childrenByParent.values()) {
          for (const kid of kids) {
            ordered.push({ entry: kid, indent: false });
          }
        }

        const rows = ordered.map(({ entry: { feature, run, phases }, indent }) => {
          const repo = path.basename(feature.repositoryPath);
          const prefix = indent ? `${colors.muted('└')} ` : '';

          return [
            prefix + feature.id.slice(0, 8),
            prefix + truncate(feature.name, indent ? 28 : 30),
            formatStatus(feature, run),
            colors.muted(repo),
            formatGates(feature),
            formatElapsed(run, phases),
            formatDone(run),
          ];
        });

        renderListView({
          title: 'Features',
          columns: [
            { label: 'ID', width: 10 },
            { label: 'Name', width: 32 },
            { label: 'Status', width: 21 },
            { label: 'Repo', width: 20 },
            { label: 'R P M ↑', width: 10 },
            { label: 'Elapsed', width: 10 },
            { label: 'Done', width: 12 },
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
