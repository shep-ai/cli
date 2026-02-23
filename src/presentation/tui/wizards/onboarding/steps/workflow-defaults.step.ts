/**
 * Onboarding Step 3: Workflow Defaults
 *
 * Checkbox prompt for selecting default workflow behaviors
 * that will apply to all new features.
 */

import { checkbox } from '@inquirer/prompts';
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
  return {
    message: 'Select workflow defaults for new features',
    instructions: '(Space to toggle, Enter to confirm)',
    theme: shepTheme,
    choices: [
      {
        name: 'Allow PRD',
        value: 'allowPrd' as const,
        description: 'Auto-approve requirements phase',
        checked: initial?.allowPrd ?? false,
      },
      {
        name: 'Allow Plan',
        value: 'allowPlan' as const,
        description: 'Auto-approve planning phase',
        checked: initial?.allowPlan ?? false,
      },
      {
        name: 'Allow Merge',
        value: 'allowMerge' as const,
        description: 'Auto-approve and auto-merge after implementation',
        checked: initial?.allowMerge ?? false,
      },
      {
        name: 'Push on finish',
        value: 'pushOnImplementationComplete' as const,
        description: 'Push branch to remote when implementation completes',
        checked: initial?.pushOnImplementationComplete ?? false,
      },
      {
        name: 'Create PR',
        value: 'openPrOnImplementationComplete' as const,
        description: 'Open pull request when implementation completes',
        checked: initial?.openPrOnImplementationComplete ?? false,
      },
    ],
  };
}

/** Static config with all defaults unchecked (used by onboarding). */
export const workflowDefaultsConfig = buildWorkflowDefaultsConfig();

/**
 * Runs the workflow defaults step.
 * Accepts optional initial values to pre-check choices (for reconfiguration).
 * Returns an object with all 5 boolean flags.
 */
export async function runWorkflowDefaultsStep(
  initial?: Partial<WorkflowDefaultsResult>
): Promise<WorkflowDefaultsResult> {
  const config = initial ? buildWorkflowDefaultsConfig(initial) : workflowDefaultsConfig;
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
