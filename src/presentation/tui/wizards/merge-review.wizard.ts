/**
 * Merge Review Wizard
 *
 * Placeholder TUI wizard for the merge approval phase.
 * Shows approve/reject action with optional comment.
 */

import { select, input } from '@inquirer/prompts';
import { getTuiI18n } from '../i18n.js';
import { shepTheme } from '../themes/shep.theme.js';

export type MergeReviewAction = 'approve' | 'reject';

export interface MergeReviewWizardResult {
  action: MergeReviewAction;
  feedback?: string;
}

export async function mergeReviewWizard(): Promise<MergeReviewWizardResult> {
  const t = getTuiI18n().t;
  const action = await select<MergeReviewAction>({
    message: t('tui:wizards.mergeReview.message'),
    choices: [
      {
        name: t('tui:wizards.mergeReview.approveAndMerge'),
        value: 'approve',
        description: t('tui:wizards.mergeReview.approveDescription'),
      },
      {
        name: t('tui:wizards.mergeReview.reject'),
        value: 'reject',
        description: t('tui:wizards.mergeReview.rejectDescription'),
      },
    ],
    theme: shepTheme,
  });

  let feedback: string | undefined;
  if (action === 'reject') {
    feedback = await input({
      message: t('tui:wizards.mergeReview.rejectFeedback'),
      theme: shepTheme,
      validate: (value) => value.trim().length > 0 || t('tui:wizards.mergeReview.feedbackRequired'),
    });
  } else {
    feedback = await input({
      message: t('tui:wizards.mergeReview.approveComment'),
      theme: shepTheme,
    });
    if (feedback?.trim().length === 0) feedback = undefined;
  }

  return { action, feedback };
}
