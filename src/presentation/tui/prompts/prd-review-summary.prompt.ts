/**
 * PRD Review Summary Prompt Configuration
 *
 * Creates an @inquirer/select config for the final approve/reject
 * action after reviewing open questions.
 */

import { shepTheme } from '../themes/shep.theme.js';

export type ReviewAction = 'approve' | 'reject';

/**
 * Creates the @inquirer/select configuration for the review action prompt.
 */
export function createReviewActionConfig(changeCount: number) {
  const changeLabel =
    changeCount > 0 ? ` (${changeCount} change${changeCount !== 1 ? 's' : ''})` : '';

  return {
    message: `Review complete${changeLabel}. What would you like to do?`,
    choices: [
      {
        name: 'Approve and continue',
        value: 'approve' as ReviewAction,
        description: 'Accept the requirements and proceed to research',
      },
      {
        name: 'Reject and iterate',
        value: 'reject' as ReviewAction,
        description: 'Provide feedback and re-run requirements',
      },
    ],
    theme: shepTheme,
  };
}
