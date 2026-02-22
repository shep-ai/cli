/**
 * Feature Reject Command
 *
 * Rejects a feature waiting for human approval, cancelling
 * the agent run with an optional reason.
 *
 * Usage:
 *   shep feat reject [id] [--reason <text>]
 */

import { Command } from 'commander';
import { container } from '@/infrastructure/di/container.js';
import type { IFeatureRepository } from '@/application/ports/output/repositories/feature-repository.interface.js';
import type { IAgentRunRepository } from '@/application/ports/output/agents/agent-run-repository.interface.js';
import { RejectAgentRunUseCase } from '@/application/use-cases/agents/reject-agent-run.use-case.js';
import { resolveWaitingFeature } from './resolve-waiting-feature.js';
import { colors, messages } from '../../ui/index.js';

export function createRejectCommand(): Command {
  return new Command('reject')
    .description('Reject a feature waiting for review')
    .argument('[id]', 'Feature ID (auto-resolves if omitted)')
    .requiredOption('--reason <text>', 'Rejection feedback (required)')
    .action(async (featureId: string | undefined, options: { reason: string }) => {
      try {
        const featureRepo = container.resolve<IFeatureRepository>('IFeatureRepository');
        const runRepo = container.resolve<IAgentRunRepository>('IAgentRunRepository');
        const repoPath = process.cwd();

        const { feature, run } = await resolveWaitingFeature({
          featureId,
          repoPath,
          featureRepo,
          runRepo,
        });

        const rejectUseCase = container.resolve(RejectAgentRunUseCase);
        const result = await rejectUseCase.execute(run.id, options.reason);

        if (!result.rejected) {
          throw new Error(result.reason);
        }

        messages.newline();
        messages.warning(`Rejected: ${feature.name}`);
        console.log(`  ${colors.muted('Reason:')}    ${options.reason}`);
        console.log(`  ${colors.muted('Iteration:')} ${result.iteration}`);
        if (result.iterationWarning) {
          messages.warning('Warning: 5+ iterations. Consider refining the prompt instead.');
        }
        console.log(`  ${colors.muted('Agent:')}     re-running requirements`);
        messages.newline();
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        messages.error('Failed to reject feature', err);
        process.exitCode = 1;
      }
    });
}
