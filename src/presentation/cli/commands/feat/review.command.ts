/**
 * Feature Review Command
 *
 * Interactive review of a feature waiting for approval.
 * Launches the PRD review wizard for requirements phase,
 * then calls approve or reject use case based on user action.
 *
 * Usage:
 *   shep feat review [id]
 */

import { Command } from 'commander';
import { container } from '@/infrastructure/di/container.js';
import type { IFeatureRepository } from '@/application/ports/output/repositories/feature-repository.interface.js';
import type { IAgentRunRepository } from '@/application/ports/output/agents/agent-run-repository.interface.js';
import { ReviewFeatureUseCase } from '@/application/use-cases/agents/review-feature.use-case.js';
import { ApproveAgentRunUseCase } from '@/application/use-cases/agents/approve-agent-run.use-case.js';
import { RejectAgentRunUseCase } from '@/application/use-cases/agents/reject-agent-run.use-case.js';
import { resolveWaitingFeature } from './resolve-waiting-feature.js';
import { prdReviewWizard } from '../../../tui/wizards/prd-review.wizard.js';
import { colors, messages } from '../../ui/index.js';

export function createReviewCommand(): Command {
  return new Command('review')
    .description('Interactive review of a feature waiting for approval')
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
        messages.info(`Reviewing: ${colors.accent(feature.name)}`);
        console.log(`  ${colors.muted('Phase:')}  ${colors.warning(phase)}`);
        console.log(`  ${colors.muted('Branch:')} ${colors.accent(feature.branch)}`);
        messages.newline();

        // Get review data
        const reviewUseCase = container.resolve(ReviewFeatureUseCase);
        const reviewResult = await reviewUseCase.execute(feature.id, repoPath);

        if (!reviewResult.success) {
          // Fallback to non-interactive display
          console.log(
            `  ${colors.muted('To approve:')} shep feat approve ${feature.id.slice(0, 8)}`
          );
          console.log(
            `  ${colors.muted('To reject:')}  shep feat reject ${feature.id.slice(0, 8)}`
          );
          messages.newline();
          return;
        }

        // Launch interactive TUI wizard
        const wizardResult = await prdReviewWizard(reviewResult.questions);

        if (wizardResult.action === 'approve') {
          const approveUseCase = container.resolve(ApproveAgentRunUseCase);
          const payload =
            wizardResult.changedSelections.length > 0
              ? { approved: true, changedSelections: wizardResult.changedSelections }
              : undefined;
          const approveResult = await approveUseCase.execute(run.id, payload);

          if (approveResult.approved) {
            messages.newline();
            messages.success(`Approved: ${feature.name}`);
            if (wizardResult.changedSelections.length > 0) {
              console.log(
                `  ${colors.muted('Changes:')} ${wizardResult.changedSelections.length} selection(s) updated`
              );
            }
            console.log(`  ${colors.muted('Agent:')}   resumed`);
            messages.newline();
          } else {
            throw new Error(approveResult.reason);
          }
        } else {
          const rejectUseCase = container.resolve(RejectAgentRunUseCase);
          const rejectResult = await rejectUseCase.execute(run.id, wizardResult.feedback!);

          if (rejectResult.rejected) {
            messages.newline();
            messages.warning(`Rejected: ${feature.name}`);
            console.log(`  ${colors.muted('Feedback:')} ${wizardResult.feedback}`);
            console.log(`  ${colors.muted('Iteration:')} ${rejectResult.iteration}`);
            if (rejectResult.iterationWarning) {
              messages.warning('Warning: 5+ iterations. Consider refining the prompt instead.');
            }
            console.log(`  ${colors.muted('Agent:')}    re-running requirements`);
            messages.newline();
          } else {
            throw new Error(rejectResult.reason);
          }
        }
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        messages.error('Failed to review feature', err);
        process.exitCode = 1;
      }
    });
}
