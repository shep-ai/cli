/**
 * Workflow Defaults Configuration Command
 *
 * Configures default approval gates, push, and PR behavior for new features.
 *
 * Usage:
 *   shep settings workflow                              # Interactive checkbox wizard
 *   shep settings workflow --allow-prd --push           # Non-interactive (set specific flags)
 *   shep settings workflow --allow-all --pr             # Enable all gates + PR
 */

import { Command } from 'commander';
import { container } from '@/infrastructure/di/container.js';
import { UpdateSettingsUseCase } from '@/application/use-cases/settings/update-settings.use-case.js';
import { runWorkflowDefaultsStep } from '../../../tui/wizards/onboarding/steps/workflow-defaults.step.js';
import type { WorkflowDefaultsResult } from '../../../tui/wizards/onboarding/types.js';
import {
  getSettings,
  resetSettings,
  initializeSettings,
} from '@/infrastructure/services/settings.service.js';
import { messages } from '../../ui/index.js';

interface WorkflowOptions {
  allowPrd?: true;
  allowPlan?: true;
  allowMerge?: true;
  allowAll?: true;
  push?: boolean;
  pr?: boolean;
}

/**
 * Create the workflow configuration command.
 */
export function createWorkflowCommand(): Command {
  return new Command('workflow')
    .description('Configure default workflow behavior for new features')
    .option('--allow-prd', 'Auto-approve requirements phase')
    .option('--allow-plan', 'Auto-approve planning phase')
    .option('--allow-merge', 'Auto-approve and auto-merge after implementation')
    .option('--allow-all', 'Enable all approval gates')
    .option('--push', 'Push branch to remote on completion')
    .option('--no-push', 'Do not push branch on completion')
    .option('--pr', 'Open PR on completion')
    .option('--no-pr', 'Do not open PR on completion')
    .addHelpText(
      'after',
      `
Examples:
  $ shep settings workflow                              Interactive wizard
  $ shep settings workflow --allow-prd --push           Set specific flags
  $ shep settings workflow --allow-all --pr             Full autonomous mode`
    )
    .action(async (options: WorkflowOptions) => {
      try {
        const hasFlags =
          options.allowPrd !== undefined ||
          options.allowPlan !== undefined ||
          options.allowMerge !== undefined ||
          options.allowAll !== undefined ||
          options.push !== undefined ||
          options.pr !== undefined;

        const settings = getSettings();
        let workflowDefaults: WorkflowDefaultsResult;

        if (hasFlags) {
          // Non-interactive: build from flags, using current settings as base
          const current = settings.workflow;
          const gates = current.approvalGateDefaults;

          if (options.allowAll) {
            workflowDefaults = {
              allowPrd: true,
              allowPlan: true,
              allowMerge: true,
              pushOnImplementationComplete: options.push ?? gates.pushOnImplementationComplete,
              openPrOnImplementationComplete: options.pr ?? current.openPrOnImplementationComplete,
            };
          } else {
            workflowDefaults = {
              allowPrd: options.allowPrd ?? gates.allowPrd,
              allowPlan: options.allowPlan ?? gates.allowPlan,
              allowMerge: options.allowMerge ?? gates.allowMerge,
              pushOnImplementationComplete: options.push ?? gates.pushOnImplementationComplete,
              openPrOnImplementationComplete: options.pr ?? current.openPrOnImplementationComplete,
            };
          }
        } else {
          // Interactive: launch checkbox wizard with current values pre-checked
          const current = settings.workflow;
          const gates = current.approvalGateDefaults;

          workflowDefaults = await runWorkflowDefaultsStep({
            allowPrd: gates.allowPrd,
            allowPlan: gates.allowPlan,
            allowMerge: gates.allowMerge,
            pushOnImplementationComplete: gates.pushOnImplementationComplete,
            openPrOnImplementationComplete: current.openPrOnImplementationComplete,
          });
        }

        // Apply to settings
        settings.workflow.approvalGateDefaults = {
          allowPrd: workflowDefaults.allowPrd,
          allowPlan: workflowDefaults.allowPlan,
          allowMerge: workflowDefaults.allowMerge,
          pushOnImplementationComplete: workflowDefaults.pushOnImplementationComplete,
        };
        settings.workflow.openPrOnImplementationComplete =
          workflowDefaults.openPrOnImplementationComplete;

        // Persist
        const useCase = container.resolve(UpdateSettingsUseCase);
        const updatedSettings = await useCase.execute(settings);

        // Refresh in-memory singleton
        resetSettings();
        initializeSettings(updatedSettings);

        const enabled = [
          workflowDefaults.allowPrd && 'Allow PRD',
          workflowDefaults.allowPlan && 'Allow Plan',
          workflowDefaults.allowMerge && 'Allow Merge',
          workflowDefaults.pushOnImplementationComplete && 'Push',
          workflowDefaults.openPrOnImplementationComplete && 'PR',
        ].filter(Boolean);

        const summary = enabled.length > 0 ? enabled.join(', ') : 'none';
        messages.success(`Workflow defaults updated: ${summary}`);
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));

        if (err.message.includes('force closed') || err.message.includes('User force closed')) {
          messages.info('Configuration cancelled.');
          return;
        }

        messages.error('Failed to configure workflow defaults', err);
        process.exitCode = 1;
      }
    });
}
