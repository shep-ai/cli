/**
 * PRD Review Wizard
 *
 * Interactive TUI wizard that walks users through open questions
 * from a PRD spec, lets them change selections, and approve or
 * reject with feedback.
 */

import { select, input } from '@inquirer/prompts';
import { createQuestionSelectConfig } from '../prompts/prd-review-question.prompt.js';
import {
  createReviewActionConfig,
  type ReviewAction,
} from '../prompts/prd-review-summary.prompt.js';
import type { OpenQuestion } from '@/application/use-cases/agents/review-feature.use-case.js';
import type { QuestionSelectionChange } from '@/domain/generated/output.js';
import { shepTheme } from '../themes/shep.theme.js';

export interface PrdReviewWizardResult {
  action: ReviewAction;
  changedSelections: QuestionSelectionChange[];
  feedback?: string;
}

/**
 * Runs the interactive PRD review wizard.
 *
 * Steps:
 * 1. For each open question, show select prompt with current options
 * 2. Track which selections changed from the original
 * 3. Show approve/reject action prompt
 * 4. If reject, prompt for feedback
 */
export async function prdReviewWizard(questions: OpenQuestion[]): Promise<PrdReviewWizardResult> {
  const changedSelections: QuestionSelectionChange[] = [];

  for (const q of questions) {
    const selected = await select<string>(
      createQuestionSelectConfig(q.question, q.options, q.selectedOption)
    );

    if (selected !== q.selectedOption) {
      changedSelections.push({
        questionId: q.question,
        selectedOption: selected,
      });
    }
  }

  const action = await select<ReviewAction>(createReviewActionConfig(changedSelections.length));

  let feedback: string | undefined;
  if (action === 'reject') {
    feedback = await input({
      message: 'What needs to change? (feedback for re-iteration)',
      theme: shepTheme,
      validate: (value) => value.trim().length > 0 || 'Feedback is required for rejection',
    });
  }

  return { action, changedSelections, feedback };
}
