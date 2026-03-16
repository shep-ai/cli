/**
 * PRD Review Question Prompt Configuration
 *
 * Creates an @inquirer/select config for reviewing a single open question
 * from the PRD spec.yaml. Users select from the available options.
 */

import { shepTheme } from '../themes/shep.theme.js';
import type { QuestionOption } from '@/domain/generated/output.js';

/**
 * Creates the @inquirer/select configuration for a single open question.
 */
export function createQuestionSelectConfig(
  question: string,
  options: QuestionOption[],
  currentAnswer?: string,
  questionNumber?: number,
  totalQuestions?: number
) {
  const choices = options.map((opt) => ({
    name: opt.option,
    value: opt.option,
    description: opt.description,
  }));

  const prefix =
    questionNumber != null && totalQuestions != null
      ? `[${questionNumber}/${totalQuestions}] `
      : '';

  return {
    message: `${prefix}${question}`,
    choices,
    default: currentAnswer,
    theme: shepTheme,
  };
}
