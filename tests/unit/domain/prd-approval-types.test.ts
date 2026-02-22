/**
 * PRD Approval TypeSpec Generated Types Test
 *
 * Verifies that all TypeSpec-defined DTOs are correctly generated
 * and have the expected shape.
 */

import { describe, it, expect } from 'vitest';
import type {
  PrdApprovalPayload,
  PrdRejectionPayload,
  PrdReviewResult,
  QuestionSelectionChange,
  ReviewQuestion,
  RejectionFeedbackEntry,
} from '@/domain/generated/output.js';

describe('PRD Approval TypeSpec Types', () => {
  it('PrdApprovalPayload has correct shape', () => {
    const payload: PrdApprovalPayload = {
      approved: true,
      changedSelections: [{ questionId: 'q1', selectedOption: 'Option A' }],
    };
    expect(payload.approved).toBe(true);
    expect(payload.changedSelections).toHaveLength(1);
  });

  it('PrdApprovalPayload works without changedSelections', () => {
    const payload: PrdApprovalPayload = { approved: true };
    expect(payload.approved).toBe(true);
    expect(payload.changedSelections).toBeUndefined();
  });

  it('PrdRejectionPayload has correct shape', () => {
    const payload: PrdRejectionPayload = {
      rejected: true,
      feedback: 'Needs more detail on API design',
      iteration: 2,
    };
    expect(payload.rejected).toBe(true);
    expect(payload.feedback).toBeTruthy();
    expect(payload.iteration).toBe(2);
  });

  it('PrdReviewResult has correct shape for approve', () => {
    const result: PrdReviewResult = {
      questions: [
        {
          question: 'Which approach?',
          options: [
            { option: 'A', description: 'Approach A', selected: true },
            { option: 'B', description: 'Approach B', selected: false },
          ],
          selectedOption: 'A',
          changed: false,
        },
      ],
      action: 'approve',
    };
    expect(result.action).toBe('approve');
    expect(result.questions).toHaveLength(1);
    expect(result.feedback).toBeUndefined();
  });

  it('PrdReviewResult has correct shape for reject', () => {
    const result: PrdReviewResult = {
      questions: [],
      action: 'reject',
      feedback: 'Not detailed enough',
    };
    expect(result.action).toBe('reject');
    expect(result.feedback).toBeTruthy();
  });

  it('QuestionSelectionChange has correct shape', () => {
    const change: QuestionSelectionChange = {
      questionId: 'Should X use A or B?',
      selectedOption: 'B',
    };
    expect(change.questionId).toBeTruthy();
    expect(change.selectedOption).toBeTruthy();
  });

  it('ReviewQuestion has correct shape', () => {
    const q: ReviewQuestion = {
      question: 'Which approach?',
      options: [{ option: 'A', description: 'desc', selected: true }],
      selectedOption: 'A',
      changed: false,
    };
    expect(q.question).toBeTruthy();
    expect(q.options).toHaveLength(1);
  });

  it('RejectionFeedbackEntry has correct shape', () => {
    const entry: RejectionFeedbackEntry = {
      iteration: 1,
      message: 'Please add error handling details',
      timestamp: new Date(),
    };
    expect(entry.iteration).toBe(1);
    expect(entry.message).toBeTruthy();
  });
});
