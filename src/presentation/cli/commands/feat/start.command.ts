/**
 * Feature Start Command
 *
 * Starts a pending feature by transitioning it to its active lifecycle
 * and spawning the agent.
 *
 * Usage:
 *   shep feat start <id>
 */

import { Command } from 'commander';
import { container } from '@/infrastructure/di/container.js';
import { StartFeatureUseCase } from '@/application/use-cases/features/start-feature.use-case.js';
import { colors, messages, spinner } from '../../ui/index.js';

export function createStartCommand(): Command {
  return new Command('start')
    .description('Start a pending feature (spawn the agent)')
    .argument('<id>', 'Feature ID (or prefix)')
    .action(async (id: string) => {
      try {
        const useCase = container.resolve(StartFeatureUseCase);
        const { feature, agentRun } = await spinner('Starting feature', () => useCase.execute(id));

        messages.newline();
        if (feature.lifecycle === 'Blocked') {
          messages.warning(
            `Feature transitioned to Blocked — parent has not reached Implementation`
          );
        } else {
          messages.success('Feature started');
        }
        console.log(`  ${colors.muted('Feature:')} ${feature.name}`);
        console.log(`  ${colors.muted('Branch:')}  ${colors.accent(feature.branch)}`);
        console.log(`  ${colors.muted('Status:')}  ${feature.lifecycle}`);
        if (feature.lifecycle !== 'Blocked') {
          console.log(
            `  ${colors.muted('Agent:')}   ${colors.success('spawned')} (run ${agentRun.id.slice(0, 8)})`
          );
        }
        messages.newline();
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        messages.error('Failed to start feature', err);
        process.exitCode = 1;
      }
    });
}
