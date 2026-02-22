/**
 * Merge Review Wizard
 *
 * Placeholder TUI wizard for the merge approval phase.
 * Shows approve/reject action with optional comment.
 */

import { select, input } from '@inquirer/prompts';
import { shepTheme } from '../themes/shep.theme.js';

export type MergeReviewAction = 'approve' | 'reject';

export interface MergeReviewWizardResult {
  action: MergeReviewAction;
  feedback?: string;
}

export async function mergeReviewWizard(): Promise<MergeReviewWizardResult> {
  const action = await select<MergeReviewAction>({
    message: 'Review the merge. What would you like to do?',
    choices: [
      {
        name: 'Approve and merge',
        value: 'approve',
        description: 'Accept the changes and merge the branch',
      },
      {
        name: 'Reject',
        value: 'reject',
        description: 'Provide feedback — implementation will iterate',
      },
    ],
    theme: shepTheme,
  });

  let feedback: string | undefined;
  if (action === 'reject') {
    feedback = await input({
      message: 'What needs to change before merging?',
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
