/**
 * Feature Approve Command
 *
 * Approves a feature waiting for human approval, resuming
 * the agent to continue with the next phase.
 *
 * Usage:
 *   shep feat approve [id]
 */

import { Command } from 'commander';
import { container } from '../../../../infrastructure/di/container.js';
import type { IFeatureRepository } from '../../../../application/ports/output/repositories/feature-repository.interface.js';
import type { IAgentRunRepository } from '../../../../application/ports/output/agents/agent-run-repository.interface.js';
import { ApproveAgentRunUseCase } from '../../../../application/use-cases/agents/approve-agent-run.use-case.js';
import { resolveWaitingFeature } from './resolve-waiting-feature.js';
import { colors, messages } from '../../ui/index.js';

export function createApproveCommand(): Command {
  return new Command('approve')
    .description('Approve a feature waiting for review')
    .argument('[id]', 'Feature ID (auto-resolves if omitted)')
    .action(async (featureId?: string) => {
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

        const approveUseCase = container.resolve(ApproveAgentRunUseCase);
        const result = await approveUseCase.execute(run.id);

        if (!result.approved) {
          throw new Error(result.reason);
        }

        const phase = run.result?.startsWith('node:') ? run.result.slice(5) : 'unknown';

        messages.newline();
        messages.success(`Approved: ${feature.name}`);
        console.log(`  ${colors.muted('Phase:')}    ${colors.success(phase)} approved`);
        console.log(`  ${colors.muted('Agent:')}    resumed`);
        messages.newline();
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        messages.error('Failed to approve feature', err);
        process.exitCode = 1;
      }
    });
}
