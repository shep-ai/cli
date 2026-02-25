/**
 * Plan Review Wizard
 *
 * Placeholder TUI wizard for the plan approval phase.
 * Shows approve/reject action with optional comment.
 */

import { select, input } from '@inquirer/prompts';
import { shepTheme } from '../themes/shep.theme.js';

export type PlanReviewAction = 'approve' | 'reject';

export interface PlanReviewWizardResult {
  action: PlanReviewAction;
  feedback?: string;
}

export async function planReviewWizard(): Promise<PlanReviewWizardResult> {
  const action = await select<PlanReviewAction>({
    message: 'Review the implementation plan. What would you like to do?',
    choices: [
      {
        name: 'Approve and continue',
        value: 'approve',
        description: 'Accept the plan and proceed to implementation',
      },
      {
        name: 'Reject and iterate',
        value: 'reject',
        description: 'Provide feedback and re-run planning',
      },
    ],
    theme: shepTheme,
  });

  let feedback: string | undefined;
  if (action === 'reject') {
    feedback = await input({
      message: 'What needs to change in the plan?',
      theme: shepTheme,
      validate: (value) => value.trim().length > 0 || 'Feedback is required for rejection',
    });
  } else {
    feedback = await input({
      message: 'Any comments? (optional, press Enter to skip)',
      theme: shepTheme,
    });
    if (feedback?.trim().length === 0) feedback = undefined;
  }

  return { action, feedback };
}
