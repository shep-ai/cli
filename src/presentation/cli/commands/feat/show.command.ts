/**
 * Feature Show Command
 *
 * Displays detailed information about a specific feature.
 * Derives real-time status from the agent run.
 *
 * Usage: shep feat show <id>
 */

import { Command } from 'commander';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { container } from '../../../../infrastructure/di/container.js';
import { ShowFeatureUseCase } from '../../../../application/use-cases/features/show-feature.use-case.js';
import type { IAgentRunRepository } from '../../../../application/ports/output/agents/agent-run-repository.interface.js';
import type { IPhaseTimingRepository } from '../../../../application/ports/output/agents/phase-timing-repository.interface.js';
import type { Feature, AgentRun, PhaseTiming } from '../../../../domain/generated/output.js';
import { colors, symbols, messages, renderDetailView } from '../../ui/index.js';
import { SHEP_HOME_DIR } from '../../../../infrastructure/services/filesystem/shep-directory.service.js';

function computeWorktreePath(repoPath: string, branch: string): string {
  const repoHash = createHash('sha256').update(repoPath).digest('hex').slice(0, 16);
  const slug = branch.replace(/\//g, '-');
  return join(SHEP_HOME_DIR, 'repos', repoHash, 'wt', slug);
}

/** Map graph node names to human-readable phase labels. */
const NODE_TO_PHASE: Record<string, string> = {
  analyze: 'Analyzing',
  requirements: 'Requirements',
  research: 'Researching',
  plan: 'Planning',
  implement: 'Implementing',
};

function formatStatus(feature: Feature, run: AgentRun | null): string {
  if (!run) {
    return `${colors.muted(symbols.dotEmpty)} ${colors.muted(feature.lifecycle)}`;
  }

  const isRunning = run.status === 'running' || run.status === 'pending';
  const phase = run.result?.startsWith('node:')
    ? (NODE_TO_PHASE[run.result.slice(5)] ?? run.result.slice(5))
    : feature.lifecycle;

  if (isRunning) {
    if (run.pid && !isProcessAlive(run.pid)) {
      return `${colors.error(symbols.error)} ${colors.error('crashed')}`;
    }
    return `${colors.info(symbols.spinner[0])} ${colors.info(phase)}`;
  }
  if (run.status === 'completed')
    return `${colors.success(symbols.success)} ${colors.success('Completed')}`;
  if (run.status === 'failed') return `${colors.error(symbols.error)} ${colors.error('Failed')}`;
  if (run.status === 'waiting_approval')
    return `${colors.warning(symbols.warning)} ${colors.warning(phase)}`;
  if (run.status === 'interrupted')
    return `${colors.error(symbols.error)} ${colors.error('Interrupted')}`;
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

export function createShowCommand(): Command {
  return new Command('show')
    .description('Show feature details')
    .argument('<id>', 'Feature ID')
    .action(async (featureId: string) => {
      try {
        const useCase = container.resolve(ShowFeatureUseCase);
        const runRepo = container.resolve<IAgentRunRepository>('IAgentRunRepository');
        const timingRepo = container.resolve<IPhaseTimingRepository>('IPhaseTimingRepository');
        const feature = await useCase.execute(featureId);
        const run = feature.agentRunId ? await runRepo.findById(feature.agentRunId) : null;
        const timings = feature.agentRunId ? await timingRepo.findByRunId(feature.agentRunId) : [];

        const worktreePath = computeWorktreePath(feature.repositoryPath, feature.branch);

        const formatTs = (ts: unknown): string => {
          if (ts instanceof Date) return ts.toLocaleString();
          return String(ts);
        };

        const textBlocks = [];

        if (feature.plan) {
          textBlocks.push({
            title: 'Plan',
            content: [`State   ${feature.plan.state}`, `Tasks   ${feature.plan.tasks.length}`].join(
              '\n'
            ),
          });
        }

        if (feature.messages.length > 0) {
          const last5 = feature.messages
            .slice(-5)
            .map((m) => `${colors.muted(`${m.role}:`)} ${m.content.slice(0, 80)}`)
            .join('\n');
          textBlocks.push({
            title: `Messages (${feature.messages.length})`,
            content: last5,
          });
        }

        if (timings.length > 0) {
          const lines = timings.map((t) => {
            const label = (NODE_TO_PHASE[t.phase] ?? t.phase).padEnd(16);
            if (t.completedAt && t.durationMs != null) {
              const secs = (Number(t.durationMs) / 1000).toFixed(1);
              return `${label} ${colors.success(`${secs}s`)}`;
            }
            return `${label} ${colors.warning('awaiting review')}`;
          });
          textBlocks.push({ title: 'Phase Timing', content: lines.join('\n') });
        }

        if (run?.status === 'waiting_approval') {
          const phase = run.result?.startsWith('node:')
            ? (NODE_TO_PHASE[run.result.slice(5)] ?? run.result.slice(5))
            : 'current phase';
          textBlocks.push({
            title: 'Awaiting Approval',
            content: [
              `${phase} is waiting for your review.`,
              '',
              `  ${colors.accent('shep feat approve')}  Resume the agent`,
              `  ${colors.accent('shep feat reject')}   Cancel with feedback`,
            ].join('\n'),
          });
        }

        renderDetailView({
          title: `Feature: ${feature.name}`,
          sections: [
            {
              fields: [
                { label: 'ID', value: feature.id },
                { label: 'Slug', value: feature.slug },
                { label: 'Description', value: feature.description },
                { label: 'Repository', value: feature.repositoryPath },
                { label: 'Branch', value: colors.accent(feature.branch) },
                { label: 'Status', value: formatStatus(feature, run) },
                { label: 'Worktree', value: worktreePath },
                { label: 'Spec Dir', value: feature.specPath ?? null },
                { label: 'Agent Run', value: feature.agentRunId ?? null },
              ],
            },
            {
              title: 'Timestamps',
              fields: [
                { label: 'Created', value: formatTs(feature.createdAt) },
                { label: 'Updated', value: formatTs(feature.updatedAt) },
              ],
            },
          ],
          textBlocks,
        });
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        messages.error('Failed to show feature', err);
        process.exitCode = 1;
      }
    });
}
