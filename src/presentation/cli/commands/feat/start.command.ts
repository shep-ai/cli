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
import { getCliI18n } from '../../i18n.js';

export function createStartCommand(): Command {
  const t = getCliI18n().t;
  return new Command('start')
    .description(t('cli:commands.feat.start.description'))
    .argument('<id>', t('cli:commands.feat.start.idArgument'))
    .action(async (id: string) => {
      try {
        const useCase = container.resolve(StartFeatureUseCase);
        const { feature, agentRun } = await spinner(t('cli:commands.feat.start.spinnerText'), () =>
          useCase.execute(id)
        );

        messages.newline();
        if (feature.lifecycle === 'Blocked') {
          messages.warning(t('cli:commands.feat.start.blockedWarning'));
        } else {
          messages.success(t('cli:commands.feat.start.featureStarted'));
        }
        console.log(`  ${colors.muted(t('cli:commands.feat.start.featureLabel'))} ${feature.name}`);
        console.log(
          `  ${colors.muted(t('cli:commands.feat.start.branchLabel'))}  ${colors.accent(feature.branch)}`
        );
        console.log(
          `  ${colors.muted(t('cli:commands.feat.start.statusLabel'))}  ${feature.lifecycle}`
        );
        if (feature.lifecycle !== 'Blocked') {
          console.log(
            `  ${colors.muted(t('cli:commands.feat.start.agentLabel'))}   ${colors.success(t('cli:commands.feat.start.spawnedStatus'))} (run ${agentRun.id.slice(0, 8)})`
          );
        }
        messages.newline();
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        messages.error(t('cli:commands.feat.start.failedToStart'), err);
        process.exitCode = 1;
      }
    });
}
