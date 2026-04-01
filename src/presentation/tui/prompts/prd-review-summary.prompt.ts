/**
 * PRD Review Summary Prompt Configuration
 *
 * Creates an @inquirer/select config for the final approve/reject
 * action after reviewing open questions.
 */

import { getTuiI18n } from '../i18n.js';
import { shepTheme } from '../themes/shep.theme.js';

export type ReviewAction = 'approve' | 'reject';

/**
 * Creates the @inquirer/select configuration for the review action prompt.
 */
export function createReviewActionConfig(changeCount: number) {
  const t = getTuiI18n().t;
  const changeLabel =
    changeCount > 0 ? t('tui:prompts.prdReview.changeLabel', { count: changeCount }) : '';

  return {
    message: t('tui:prompts.prdReview.reviewComplete', { changeLabel }),
    choices: [
      {
        name: t('tui:prompts.prdReview.approveAndContinue'),
        value: 'approve' as ReviewAction,
        description: t('tui:prompts.prdReview.approveDescription'),
      },
      {
        name: t('tui:prompts.prdReview.rejectAndIterate'),
        value: 'reject' as ReviewAction,
        description: t('tui:prompts.prdReview.rejectDescription'),
      },
    ],
    theme: shepTheme,
  };
}
