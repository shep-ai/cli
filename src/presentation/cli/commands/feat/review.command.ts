/**
 * Feature Review Command
 *
 * Shows the current state of a feature waiting for approval,
 * including which phase triggered the interrupt and generated content.
 *
 * Usage:
 *   shep feat review [id]
 */

import { Command } from 'commander';
import { container } from '../../../../infrastructure/di/container.js';
import type { IFeatureRepository } from '../../../../application/ports/output/repositories/feature-repository.interface.js';
import type { IAgentRunRepository } from '../../../../application/ports/output/agents/agent-run-repository.interface.js';
import { resolveWaitingFeature } from './resolve-waiting-feature.js';
import { colors, messages } from '../../ui/index.js';

export function createReviewCommand(): Command {
  return new Command('review')
    .description('Review a feature waiting for approval')
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

        const phase = run.result?.startsWith('node:') ? run.result.slice(5) : 'unknown';

        messages.newline();
        messages.info(`Feature waiting for approval: ${colors.accent(feature.name)}`);
        console.log(`  ${colors.muted('ID:')}     ${feature.id.slice(0, 8)}`);
        console.log(`  ${colors.muted('Phase:')}  ${colors.warning(phase)}`);
        console.log(`  ${colors.muted('Branch:')} ${colors.accent(feature.branch)}`);
        if (feature.specPath) {
          console.log(`  ${colors.muted('Specs:')}  ${feature.specPath}`);
        }
        messages.newline();
        console.log(`  ${colors.muted('To approve:')} shep feat approve ${feature.id.slice(0, 8)}`);
        console.log(`  ${colors.muted('To reject:')}  shep feat reject ${feature.id.slice(0, 8)}`);
        messages.newline();
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        messages.error('Failed to review feature', err);
        process.exitCode = 1;
      }
    });
}
