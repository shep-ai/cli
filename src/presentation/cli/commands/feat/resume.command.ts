/**
 * Feature Resume Command
 *
 * Resumes an interrupted or failed feature agent run.
 *
 * Usage:
 *   shep feat resume <id>
 */

import { Command } from 'commander';
import { container } from '@/infrastructure/di/container.js';
import { ResumeFeatureUseCase } from '@/application/use-cases/features/resume-feature.use-case.js';
import { colors, messages } from '../../ui/index.js';

export function createResumeCommand(): Command {
  return new Command('resume')
    .description('Resume a stopped or failed feature agent')
    .argument('<id>', 'Feature ID (or prefix)')
    .action(async (id: string) => {
      try {
        const useCase = container.resolve(ResumeFeatureUseCase);
        const { feature, newRun } = await useCase.execute(id);

        messages.newline();
        messages.success('Feature agent resumed');
        console.log(`  ${colors.muted('Feature:')} ${feature.name}`);
        console.log(`  ${colors.muted('Run ID:')}  ${colors.accent(newRun.id.substring(0, 8))}`);
        messages.newline();
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        messages.error('Failed to resume feature', err);
        process.exitCode = 1;
      }
    });
}
