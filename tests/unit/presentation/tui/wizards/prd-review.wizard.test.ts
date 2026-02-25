/**
 * PRD Review Wizard Unit Tests
 *
 * TDD Phase: RED -> GREEN
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('@inquirer/prompts', () => ({
  select: vi.fn(),
  input: vi.fn(),
}));

import { select, input } from '@inquirer/prompts';
import { prdReviewWizard } from '../../../../../src/presentation/tui/wizards/prd-review.wizard.js';
import type { OpenQuestion } from '@/application/use-cases/agents/review-feature.use-case.js';

const mockSelect = select as ReturnType<typeof vi.fn>;
const mockInput = input as ReturnType<typeof vi.fn>;

const makeQuestions = (): OpenQuestion[] => [
  {
    question: 'Which database?',
    options: [
      { option: 'PostgreSQL', description: 'Relational DB', selected: true },
      { option: 'MongoDB', description: 'Document DB', selected: false },
    ],
    selectedOption: 'PostgreSQL',
  },
  {
    question: 'Which framework?',
    options: [
      { option: 'Express', description: 'Minimal', selected: true },
      { option: 'Fastify', description: 'Performance', selected: false },
    ],
    selectedOption: 'Express',
  },
];

describe('prdReviewWizard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return approve with empty changedSelections when no changes made', async () => {
    const questions = makeQuestions();
    // Select same options as current, then approve
    mockSelect
      .mockResolvedValueOnce('PostgreSQL') // question 1: same
      .mockResolvedValueOnce('Express') // question 2: same
      .mockResolvedValueOnce('approve'); // action

    const result = await prdReviewWizard(questions);

    expect(result.action).toBe('approve');
    expect(result.changedSelections).toEqual([]);
    expect(result.feedback).toBeUndefined();
  });

  it('should return approve with changedSelections when options changed', async () => {
    const questions = makeQuestions();
    mockSelect
      .mockResolvedValueOnce('MongoDB') // question 1: changed
      .mockResolvedValueOnce('Express') // question 2: same
      .mockResolvedValueOnce('approve'); // action

    const result = await prdReviewWizard(questions);

    expect(result.action).toBe('approve');
    expect(result.changedSelections).toEqual([
      { questionId: 'Which database?', selectedOption: 'MongoDB' },
    ]);
  });

  it('should return reject with feedback', async () => {
    const questions = makeQuestions();
    mockSelect
      .mockResolvedValueOnce('PostgreSQL') // question 1
      .mockResolvedValueOnce('Express') // question 2
      .mockResolvedValueOnce('reject'); // action
    mockInput.mockResolvedValueOnce('Need more research on caching');

    const result = await prdReviewWizard(questions);

    expect(result.action).toBe('reject');
    expect(result.feedback).toBe('Need more research on caching');
  });

  it('should not prompt for feedback on approve', async () => {
    const questions = makeQuestions();
    mockSelect
      .mockResolvedValueOnce('PostgreSQL')
      .mockResolvedValueOnce('Express')
      .mockResolvedValueOnce('approve');

    await prdReviewWizard(questions);

    expect(mockInput).not.toHaveBeenCalled();
  });

  it('should track multiple changed selections', async () => {
    const questions = makeQuestions();
    mockSelect
      .mockResolvedValueOnce('MongoDB') // changed
      .mockResolvedValueOnce('Fastify') // changed
      .mockResolvedValueOnce('approve');

    const result = await prdReviewWizard(questions);

    expect(result.changedSelections).toHaveLength(2);
    expect(result.changedSelections).toEqual([
      { questionId: 'Which database?', selectedOption: 'MongoDB' },
      { questionId: 'Which framework?', selectedOption: 'Fastify' },
    ]);
  });
});
