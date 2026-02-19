/**
 * Feature Show Command
 *
 * Displays detailed information about a specific feature.
 * Derives real-time status from the agent run.
 *
 * Usage: shep feat show <id>
 */

import { Command } from 'commander';
import { container } from '@/infrastructure/di/container.js';
import { ShowFeatureUseCase } from '@/application/use-cases/features/show-feature.use-case.js';
import type { IAgentRunRepository } from '@/application/ports/output/agents/agent-run-repository.interface.js';
import type { IPhaseTimingRepository } from '@/application/ports/output/agents/phase-timing-repository.interface.js';
import type { Feature, AgentRun } from '@/domain/generated/output.js';
import { colors, symbols, messages, renderDetailView } from '../../ui/index.js';
import { computeWorktreePath } from '@/infrastructure/services/ide-launchers/compute-worktree-path.js';

/** Map graph node names to human-readable phase labels (active). */
const NODE_TO_PHASE: Record<string, string> = {
  analyze: 'Analyzing',
  requirements: 'Requirements',
  research: 'Researching',
  plan: 'Planning',
  implement: 'Implementing',
  merge: 'Merging',
};

/** Map graph node names to approval action labels. */
const NODE_TO_APPROVE: Record<string, string> = {
  analyze: 'Approve Analysis',
  requirements: 'Approve PRD',
  research: 'Approve Research',
  plan: 'Approve Plan',
  implement: 'Approve Implementation',
  merge: 'Approve Merge',
};

function formatStatus(feature: Feature, run: AgentRun | null): string {
  if (!run) {
    return `${colors.muted(symbols.dotEmpty)} ${colors.muted(feature.lifecycle)}`;
  }

  const isRunning = run.status === 'running' || run.status === 'pending';
  const nodeName = run.result?.startsWith('node:') ? run.result.slice(5) : undefined;
  const phase = nodeName ? (NODE_TO_PHASE[nodeName] ?? nodeName) : feature.lifecycle;

  if (isRunning) {
    if (run.pid && !isProcessAlive(run.pid)) {
      return `${colors.error(symbols.error)} ${colors.error('crashed')}`;
    }
    return `${colors.info(symbols.spinner[0])} ${colors.info(phase)}`;
  }
  if (run.status === 'completed')
    return `${colors.success(symbols.success)} ${colors.success('Completed')}`;
  if (run.status === 'failed') return `${colors.error(symbols.error)} ${colors.error('Failed')}`;
  if (run.status === 'waiting_approval') {
    const action = nodeName ? (NODE_TO_APPROVE[nodeName] ?? phase) : phase;
    return `${colors.warning(symbols.warning)} ${colors.warning(action)}`;
  }
  if (run.status === 'interrupted')
    return `${colors.error(symbols.error)} ${colors.error('Interrupted')}`;
  return `${colors.muted(symbols.dotEmpty)} ${colors.muted(phase)}`;
}

function formatLifecycle(lifecycle: string): string {
  if (lifecycle === 'Maintain') return colors.success(lifecycle);
  if (lifecycle === 'Review') return colors.warning(lifecycle);
  return colors.info(lifecycle);
}

function formatDuration(ms: number): string {
  const secs = ms / 1000;
  const totalSecs = Math.round(secs);
  const mins = Math.floor(totalSecs / 60);
  const remSecs = totalSecs % 60;
  const secsStr = secs.toFixed(1);
  if (mins > 0) {
    return `${secsStr}s (${mins}m ${remSecs}s)`;
  }
  return `${secsStr}s`;
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

        const worktreePath =
          feature.worktreePath ?? computeWorktreePath(feature.repositoryPath, feature.branch);

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
          const isWaiting = run?.status === 'waiting_approval';
          const maxDurationMs = Math.max(
            ...timings.map((t) => (t.durationMs != null ? Number(t.durationMs) : 0))
          );
          const MAX_BAR = 20;

          const lines: string[] = [];
          for (const [idx, t] of timings.entries()) {
            const isLast = idx === timings.length - 1;
            const isSubPhase = t.phase.includes(':');
            const label = isSubPhase
              ? `  \u21b3 ${t.phase.split(':')[1]}`.padEnd(16)
              : (NODE_TO_PHASE[t.phase] ?? t.phase).padEnd(16);

            // Completed phase - green bar with duration
            if (t.completedAt && t.durationMs != null) {
              const ms = Number(t.durationMs);
              const secs = (ms / 1000).toFixed(1);
              const barLen =
                maxDurationMs > 0
                  ? Math.min(MAX_BAR, Math.max(1, Math.round((ms / maxDurationMs) * MAX_BAR)))
                  : 1;
              const bar = `${colors.success('\u2588'.repeat(barLen))}${colors.muted('\u2591'.repeat(MAX_BAR - barLen))}`;
              lines.push(`${label} ${bar} ${secs}s`);
            }
            // Waiting for approval - only the LAST timing
            else if (isLast && isWaiting) {
              lines.push(`${label} ${colors.warning('awaiting review')}`);
            }
            // Running phase - blue bar with elapsed time
            else {
              const elapsedMs = Math.max(0, Date.now() - new Date(t.startedAt).getTime());
              const secs = (elapsedMs / 1000).toFixed(1);
              const barLen =
                maxDurationMs > 0
                  ? Math.min(
                      MAX_BAR,
                      Math.max(1, Math.round((elapsedMs / maxDurationMs) * MAX_BAR))
                    )
                  : 1;
              const bar = `${colors.info('\u2588'.repeat(barLen))}${colors.muted('\u2591'.repeat(MAX_BAR - barLen))}`;
              lines.push(`${label} ${bar} ${secs}s (running)`);
            }

            // Show approval wait time under gated phases
            if (t.approvalWaitMs != null && Number(t.approvalWaitMs) > 0) {
              // Completed approval wait - show final duration
              const waitMs = Number(t.approvalWaitMs);
              const waitSecs = (waitMs / 1000).toFixed(1);
              const waitLabel = '  \u21b3 approval'.padEnd(16);
              const waitBarLen =
                maxDurationMs > 0
                  ? Math.min(MAX_BAR, Math.max(1, Math.round((waitMs / maxDurationMs) * MAX_BAR)))
                  : 1;
              const waitBar = `${colors.warning('\u2588'.repeat(waitBarLen))}${colors.muted('\u2591'.repeat(MAX_BAR - waitBarLen))}`;
              lines.push(`${waitLabel} ${waitBar} ${waitSecs}s`);
            } else if (isLast && isWaiting && t.waitingApprovalAt) {
              // Live approval wait - show elapsed time
              const waitStart =
                t.waitingApprovalAt instanceof Date
                  ? t.waitingApprovalAt.getTime()
                  : Number(t.waitingApprovalAt);
              const waitElapsedMs = Math.max(0, Date.now() - waitStart);
              const waitSecs = (waitElapsedMs / 1000).toFixed(1);
              const waitLabel = '  \u21b3 approval'.padEnd(16);
              const waitBarLen =
                maxDurationMs > 0
                  ? Math.min(
                      MAX_BAR,
                      Math.max(1, Math.round((waitElapsedMs / maxDurationMs) * MAX_BAR))
                    )
                  : 1;
              const waitBar = `${colors.warning('\u2588'.repeat(waitBarLen))}${colors.muted('\u2591'.repeat(MAX_BAR - waitBarLen))}`;
              lines.push(`${waitLabel} ${waitBar} ${waitSecs}s (waiting)`);
            }
          }

          // Summary totals
          const totalExecMs = timings.reduce(
            (sum, t) => sum + (t.durationMs != null ? Number(t.durationMs) : 0),
            0
          );
          const totalWaitMs = timings.reduce(
            (sum, t) => sum + (t.approvalWaitMs != null ? Number(t.approvalWaitMs) : 0),
            0
          );

          if (totalExecMs > 0) {
            lines.push('');
            lines.push(`${'Total execution'.padEnd(16)} ${formatDuration(totalExecMs)}`);
            if (totalWaitMs > 0) {
              lines.push(`${'Total wait'.padEnd(16)} ${formatDuration(totalWaitMs)}`);
              lines.push(
                `${'Total wall-clock'.padEnd(16)} ${formatDuration(totalExecMs + totalWaitMs)}`
              );
            }
          }

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
                { label: 'User Query', value: feature.userQuery },
                { label: 'Repository', value: feature.repositoryPath },
                { label: 'Branch', value: colors.accent(feature.branch) },
                { label: 'Status', value: formatStatus(feature, run) },
                { label: 'Lifecycle', value: formatLifecycle(feature.lifecycle) },
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
            {
              title: 'Workflow',
              fields: [
                {
                  label: 'Push',
                  value: feature.push ? colors.success('Yes') : colors.muted('No'),
                },
                {
                  label: 'Open PR',
                  value: feature.openPr ? colors.success('Yes') : colors.muted('No'),
                },
                {
                  label: 'Gates',
                  value: feature.approvalGates
                    ? [
                        `PRD ${feature.approvalGates.allowPrd ? colors.success('\u2713') : colors.error('\u2717')}`,
                        `Plan ${feature.approvalGates.allowPlan ? colors.success('\u2713') : colors.error('\u2717')}`,
                        `Merge ${feature.approvalGates.allowMerge ? colors.success('\u2713') : colors.error('\u2717')}`,
                      ].join('  ')
                    : colors.muted('not set'),
                },
              ],
            },
            ...(feature.pr
              ? [
                  {
                    title: 'Pull Request',
                    fields: [
                      { label: 'URL', value: feature.pr.url },
                      { label: 'Number', value: `#${feature.pr.number}` },
                      {
                        label: 'Status',
                        value:
                          feature.pr.status === 'Merged'
                            ? colors.success(`${feature.pr.status} \u2713`)
                            : feature.pr.status === 'Closed'
                              ? colors.error(feature.pr.status)
                              : colors.warning(feature.pr.status),
                      },
                      { label: 'Commit', value: feature.pr.commitHash ?? null },
                      {
                        label: 'CI',
                        value: feature.pr.ciStatus
                          ? feature.pr.ciStatus === 'Success'
                            ? colors.success(`${feature.pr.ciStatus} \u2713`)
                            : feature.pr.ciStatus === 'Failure'
                              ? colors.error(`${feature.pr.ciStatus} \u2717`)
                              : colors.warning(feature.pr.ciStatus)
                          : null,
                      },
                    ],
                  },
                ]
              : []),
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
