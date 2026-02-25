import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TechDecisionsReview } from '@/components/common/tech-decisions-review';
import type { TechDecisionsReviewProps } from '@/components/common/tech-decisions-review';

/* ------------------------------------------------------------------ */
/*  Mock useSoundAction                                                */
/* ------------------------------------------------------------------ */

const mockExpandPlay = vi.fn();
const mockCollapsePlay = vi.fn();

vi.mock('@/hooks/use-sound-action', () => ({
  useSoundAction: vi.fn((action: string) => {
    if (action === 'expand') return { play: mockExpandPlay, stop: vi.fn(), isPlaying: false };
    if (action === 'collapse') return { play: mockCollapsePlay, stop: vi.fn(), isPlaying: false };
    return { play: vi.fn(), stop: vi.fn(), isPlaying: false };
  }),
}));

const defaultProps: TechDecisionsReviewProps = {
  data: {
    name: 'Test Feature',
    summary: 'A test feature summary',
    decisions: [
      {
        title: 'Database Choice',
        chosen: 'PostgreSQL',
        rationale: 'Best for relational data',
        rejected: ['MongoDB', 'SQLite'],
      },
    ],
    technologies: ['TypeScript'],
  },
  onApprove: vi.fn(),
};

describe('TechDecisionsReview — sound effects', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('plays expand sound when toggling alternatives open', () => {
    render(<TechDecisionsReview {...defaultProps} />);

    const toggleButton = screen.getByText(/Other Options Considered/i).closest('button')!;
    fireEvent.click(toggleButton);

    expect(mockExpandPlay).toHaveBeenCalledOnce();
    expect(mockCollapsePlay).not.toHaveBeenCalled();
  });

  it('plays collapse sound when toggling alternatives closed', () => {
    render(<TechDecisionsReview {...defaultProps} />);

    const toggleButton = screen.getByText(/Other Options Considered/i).closest('button')!;

    // Open first
    fireEvent.click(toggleButton);
    vi.clearAllMocks();

    // Close
    fireEvent.click(toggleButton);

    expect(mockCollapsePlay).toHaveBeenCalledOnce();
    expect(mockExpandPlay).not.toHaveBeenCalled();
  });
});
