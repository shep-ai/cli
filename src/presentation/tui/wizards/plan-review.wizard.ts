/**
 * Plan Review Wizard
 *
 * Placeholder TUI wizard for the plan approval phase.
 * Shows approve/reject action with optional comment.
 */

import { select, input } from '@inquirer/prompts';
import { getTuiI18n } from '../i18n.js';
import { shepTheme } from '../themes/shep.theme.js';

export type PlanReviewAction = 'approve' | 'reject';

export interface PlanReviewWizardResult {
  action: PlanReviewAction;
  feedback?: string;
}

export async function planReviewWizard(): Promise<PlanReviewWizardResult> {
  const t = getTuiI18n().t;
  const action = await select<PlanReviewAction>({
    message: t('tui:wizards.planReview.message'),
    choices: [
      {
        name: t('tui:wizards.planReview.approveAndContinue'),
        value: 'approve',
        description: t('tui:wizards.planReview.approveDescription'),
      },
      {
        name: t('tui:wizards.planReview.rejectAndIterate'),
        value: 'reject',
        description: t('tui:wizards.planReview.rejectDescription'),
      },
    ],
    theme: shepTheme,
  });

  let feedback: string | undefined;
  if (action === 'reject') {
    feedback = await input({
      message: t('tui:wizards.planReview.rejectFeedback'),
      theme: shepTheme,
      validate: (value) => value.trim().length > 0 || t('tui:wizards.planReview.feedbackRequired'),
    });
  } else {
    feedback = await input({
      message: t('tui:wizards.planReview.approveComment'),
      theme: shepTheme,
    });
    if (feedback?.trim().length === 0) feedback = undefined;
  }

  return { action, feedback };
}
