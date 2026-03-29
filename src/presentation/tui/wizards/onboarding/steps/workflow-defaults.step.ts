/**
 * Onboarding Step 3: Workflow Defaults
 *
 * Checkbox prompt for selecting default workflow behaviors
 * that will apply to all new features.
 */

import { checkbox } from '@inquirer/prompts';
import { getTuiI18n } from '../../../i18n.js';
import { shepTheme } from '../../../themes/shep.theme.js';
import type { WorkflowDefaultsResult } from '../types.js';

/** Keys used as checkbox values. */
export type WorkflowDefaultKey =
  | 'allowPrd'
  | 'allowPlan'
  | 'allowMerge'
  | 'pushOnImplementationComplete'
  | 'openPrOnImplementationComplete';

/**
 * Build checkbox configuration for workflow defaults.
 * Accepts optional initial values to pre-check choices (for reconfiguration).
 */
export function buildWorkflowDefaultsConfig(initial?: Partial<WorkflowDefaultsResult>) {
  const t = getTuiI18n().t;
  return {
    message: t('tui:wizards.workflowDefaults.message'),
    instructions: t('tui:wizards.workflowDefaults.instructions'),
    theme: shepTheme,
    choices: [
      {
        name: t('tui:wizards.workflowDefaults.allowPrd'),
        value: 'allowPrd' as const,
        description: t('tui:wizards.workflowDefaults.allowPrdDescription'),
        checked: initial?.allowPrd ?? false,
      },
      {
        name: t('tui:wizards.workflowDefaults.allowPlan'),
        value: 'allowPlan' as const,
        description: t('tui:wizards.workflowDefaults.allowPlanDescription'),
        checked: initial?.allowPlan ?? false,
      },
      {
        name: t('tui:wizards.workflowDefaults.allowMerge'),
        value: 'allowMerge' as const,
        description: t('tui:wizards.workflowDefaults.allowMergeDescription'),
        checked: initial?.allowMerge ?? false,
      },
      {
        name: t('tui:wizards.workflowDefaults.pushOnFinish'),
        value: 'pushOnImplementationComplete' as const,
        description: t('tui:wizards.workflowDefaults.pushOnFinishDescription'),
        checked: initial?.pushOnImplementationComplete ?? false,
      },
      {
        name: t('tui:wizards.workflowDefaults.createPr'),
        value: 'openPrOnImplementationComplete' as const,
        description: t('tui:wizards.workflowDefaults.createPrDescription'),
        checked: initial?.openPrOnImplementationComplete ?? false,
      },
    ],
  };
}

/**
 * Runs the workflow defaults step.
 * Accepts optional initial values to pre-check choices (for reconfiguration).
 * Returns an object with all 5 boolean flags.
 */
export async function runWorkflowDefaultsStep(
  initial?: Partial<WorkflowDefaultsResult>
): Promise<WorkflowDefaultsResult> {
  const config = buildWorkflowDefaultsConfig(initial);
  const selected = await checkbox(config);
  const selectedSet = new Set(selected as WorkflowDefaultKey[]);

  return {
    allowPrd: selectedSet.has('allowPrd'),
    allowPlan: selectedSet.has('allowPlan'),
    allowMerge: selectedSet.has('allowMerge'),
    pushOnImplementationComplete: selectedSet.has('pushOnImplementationComplete'),
    openPrOnImplementationComplete: selectedSet.has('openPrOnImplementationComplete'),
  };
}
