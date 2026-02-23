/**
 * Onboarding Step 3: Workflow Defaults
 *
 * Checkbox prompt for selecting default workflow behaviors
 * that will apply to all new features.
 */

import { checkbox } from '@inquirer/prompts';
import { shepTheme } from '../../../themes/shep.theme.js';
import type { WorkflowDefaultsResult } from '../types.js';

/**
 * Checkbox configuration for workflow defaults.
 */
export const workflowDefaultsConfig = {
  message: 'Select workflow defaults for new features',
  instructions: '(Space to toggle, Enter to confirm)',
  theme: shepTheme,
  choices: [
    {
      name: 'Allow PRD',
      value: 'allowPrd' as const,
      description: 'Auto-approve requirements phase',
      checked: false,
    },
    {
      name: 'Allow Plan',
      value: 'allowPlan' as const,
      description: 'Auto-approve planning phase',
      checked: false,
    },
    {
      name: 'Allow Merge',
      value: 'allowMerge' as const,
      description: 'Auto-approve merge phase',
      checked: false,
    },
    {
      name: 'Push on finish',
      value: 'pushOnImplementationComplete' as const,
      description: 'Push branch to remote when implementation completes',
      checked: false,
    },
    {
      name: 'Create PR',
      value: 'openPrOnImplementationComplete' as const,
      description: 'Open pull request when implementation completes',
      checked: false,
    },
    {
      name: 'Auto-merge',
      value: 'autoMergeOnImplementationComplete' as const,
      description: 'Automatically merge after implementation completes',
      checked: false,
    },
  ],
} as const;

type WorkflowDefaultKey = (typeof workflowDefaultsConfig.choices)[number]['value'];

/**
 * Runs the workflow defaults step.
 * Returns an object with all 6 boolean flags.
 */
export async function runWorkflowDefaultsStep(): Promise<WorkflowDefaultsResult> {
  const selected = await checkbox(workflowDefaultsConfig);
  const selectedSet = new Set(selected as WorkflowDefaultKey[]);

  return {
    allowPrd: selectedSet.has('allowPrd'),
    allowPlan: selectedSet.has('allowPlan'),
    allowMerge: selectedSet.has('allowMerge'),
    pushOnImplementationComplete: selectedSet.has('pushOnImplementationComplete'),
    openPrOnImplementationComplete: selectedSet.has('openPrOnImplementationComplete'),
    autoMergeOnImplementationComplete: selectedSet.has('autoMergeOnImplementationComplete'),
  };
}
