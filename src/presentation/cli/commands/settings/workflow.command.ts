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
import { getCliI18n } from '../../i18n.js';

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
    .description(getCliI18n().t('cli:commands.settings.workflow.description'))
    .option('--allow-prd', getCliI18n().t('cli:commands.settings.workflow.allowPrdOption'))
    .option('--allow-plan', getCliI18n().t('cli:commands.settings.workflow.allowPlanOption'))
    .option('--allow-merge', getCliI18n().t('cli:commands.settings.workflow.allowMergeOption'))
    .option('--allow-all', getCliI18n().t('cli:commands.settings.workflow.allowAllOption'))
    .option('--push', getCliI18n().t('cli:commands.settings.workflow.pushOption'))
    .option('--no-push', getCliI18n().t('cli:commands.settings.workflow.noPushOption'))
    .option('--pr', getCliI18n().t('cli:commands.settings.workflow.prOption'))
    .option('--no-pr', getCliI18n().t('cli:commands.settings.workflow.noPrOption'))
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

        const t = getCliI18n().t;
        const enabled = [
          workflowDefaults.allowPrd && t('cli:commands.settings.workflow.allowPrd'),
          workflowDefaults.allowPlan && t('cli:commands.settings.workflow.allowPlan'),
          workflowDefaults.allowMerge && t('cli:commands.settings.workflow.allowMerge'),
          workflowDefaults.pushOnImplementationComplete && t('cli:commands.settings.workflow.push'),
          workflowDefaults.openPrOnImplementationComplete && t('cli:commands.settings.workflow.pr'),
        ].filter(Boolean);

        const summary =
          enabled.length > 0 ? enabled.join(', ') : t('cli:commands.settings.workflow.summaryNone');
        messages.success(t('cli:commands.settings.workflow.success', { summary }));
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));

        if (err.message.includes('force closed') || err.message.includes('User force closed')) {
          messages.info(getCliI18n().t('cli:commands.settings.workflow.cancelled'));
          return;
        }

        messages.error(getCliI18n().t('cli:commands.settings.workflow.failed'), err);
        process.exitCode = 1;
      }
    });
}
