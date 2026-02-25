import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PrdQuestionnaire } from '@/components/common/prd-questionnaire';
import type { PrdQuestionnaireProps } from '@/components/common/prd-questionnaire';

/* ------------------------------------------------------------------ */
/*  Mock useSoundAction                                                */
/* ------------------------------------------------------------------ */

const mockSelectPlay = vi.fn();
const mockNavigatePlay = vi.fn();

vi.mock('@/hooks/use-sound-action', () => ({
  useSoundAction: vi.fn((action: string) => {
    if (action === 'select') return { play: mockSelectPlay, stop: vi.fn(), isPlaying: false };
    if (action === 'navigate') return { play: mockNavigatePlay, stop: vi.fn(), isPlaying: false };
    return { play: vi.fn(), stop: vi.fn(), isPlaying: false };
  }),
}));

const defaultProps: PrdQuestionnaireProps = {
  data: {
    question: 'Review Requirements',
    context: 'Please review.',
    questions: [
      {
        id: 'q-1',
        question: 'What problem does this solve?',
        type: 'select',
        options: [
          { id: 'opt-a', label: 'Pain Point', rationale: 'User pain', recommended: true },
          { id: 'opt-b', label: 'Feature Gap', rationale: 'Missing feature' },
        ],
      },
      {
        id: 'q-2',
        question: 'What is the priority?',
        type: 'select',
        options: [
          { id: 'p0', label: 'P0', rationale: 'Critical' },
          { id: 'p1', label: 'P1', rationale: 'High', recommended: true },
        ],
      },
    ],
    finalAction: { id: 'approve', label: 'Approve', description: 'Approve' },
  },
  selections: {},
  onSelect: vi.fn(),
  onApprove: vi.fn(),
};

describe('PrdQuestionnaire — sound effects', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('plays select sound when option is clicked', () => {
    render(<PrdQuestionnaire {...defaultProps} />);

    const button = screen
      .getAllByRole('button')
      .find((btn) => btn.textContent?.includes('Pain Point'));
    fireEvent.click(button!);

    expect(mockSelectPlay).toHaveBeenCalledOnce();
  });

  it('plays navigate sound when Previous button is clicked', () => {
    // Start on step 2 by clicking step dot
    render(<PrdQuestionnaire {...defaultProps} />);

    // Navigate to step 2 via step dot
    const stepDots = screen.getAllByRole('button', { name: /Go to question/ });
    fireEvent.click(stepDots[1]);

    vi.clearAllMocks();

    // Click Previous
    const prevButton = screen.getByRole('button', { name: /previous/i });
    fireEvent.click(prevButton);

    expect(mockNavigatePlay).toHaveBeenCalledOnce();
  });

  it('plays navigate sound when Next/Skip button is clicked', () => {
    render(<PrdQuestionnaire {...defaultProps} />);

    const skipButton = screen.getByRole('button', { name: /skip/i });
    fireEvent.click(skipButton);

    expect(mockNavigatePlay).toHaveBeenCalledOnce();
  });

  it('plays navigate sound when step dot is clicked', () => {
    render(<PrdQuestionnaire {...defaultProps} />);

    const stepDots = screen.getAllByRole('button', { name: /Go to question/ });
    fireEvent.click(stepDots[1]);

    expect(mockNavigatePlay).toHaveBeenCalledOnce();
  });
});
