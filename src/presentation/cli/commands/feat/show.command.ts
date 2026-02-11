/**
 * Feature Show Command
 *
 * Displays detailed information about a specific feature.
 *
 * Usage: shep feat show <id>
 *
 * @example
 * $ shep feat show feat-123
 */

import { Command } from 'commander';
import { container } from '../../../../infrastructure/di/container.js';
import { ShowFeatureUseCase } from '../../../../application/use-cases/features/show-feature.use-case.js';
import { colors, fmt, messages } from '../../ui/index.js';

/**
 * Create the feat show command
 */
export function createShowCommand(): Command {
  return new Command('show')
    .description('Show feature details')
    .argument('<id>', 'Feature ID')
    .action(async (featureId: string) => {
      try {
        const useCase = container.resolve(ShowFeatureUseCase);
        const feature = await useCase.execute(featureId);

        messages.newline();
        console.log(fmt.heading(`Feature: ${feature.name}`));
        messages.newline();

        // Overview section
        console.log(`  ${colors.muted('ID:')}          ${feature.id}`);
        console.log(`  ${colors.muted('Slug:')}        ${feature.slug}`);
        console.log(`  ${colors.muted('Description:')} ${feature.description}`);
        console.log(`  ${colors.muted('Repository:')}  ${feature.repositoryPath}`);
        console.log(`  ${colors.muted('Branch:')}      ${colors.accent(feature.branch)}`);
        console.log(`  ${colors.muted('Lifecycle:')}   ${feature.lifecycle}`);

        if (feature.agentRunId) {
          console.log(`  ${colors.muted('Agent Run:')}   ${feature.agentRunId}`);
        }

        const created =
          feature.createdAt instanceof Date
            ? feature.createdAt.toLocaleString()
            : String(feature.createdAt);
        const updated =
          feature.updatedAt instanceof Date
            ? feature.updatedAt.toLocaleString()
            : String(feature.updatedAt);
        console.log(`  ${colors.muted('Created:')}     ${created}`);
        console.log(`  ${colors.muted('Updated:')}     ${updated}`);

        // Plan section
        if (feature.plan) {
          messages.newline();
          console.log(fmt.heading('Plan'));
          console.log(`  ${colors.muted('State:')} ${feature.plan.state}`);
          console.log(`  ${colors.muted('Tasks:')} ${feature.plan.tasks.length}`);
        }

        // Messages section
        if (feature.messages.length > 0) {
          messages.newline();
          console.log(fmt.heading(`Messages (${feature.messages.length})`));
          for (const msg of feature.messages.slice(-5)) {
            console.log(`  ${colors.muted(`${msg.role}:`)} ${msg.content.slice(0, 80)}`);
          }
        }

        messages.newline();
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        messages.error('Failed to show feature', err);
        process.exitCode = 1;
      }
    });
}
