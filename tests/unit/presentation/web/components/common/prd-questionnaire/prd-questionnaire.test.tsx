import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PrdQuestionnaire } from '@/components/common/prd-questionnaire';
import type { PrdQuestionnaireProps } from '@/components/common/prd-questionnaire';

function makeOption(
  overrides: Partial<{
    id: string;
    label: string;
    rationale: string;
    recommended: boolean;
    isNew: boolean;
  }> = {}
) {
  return {
    id: overrides.id ?? 'opt-1',
    label: overrides.label ?? 'Option A',
    rationale: overrides.rationale ?? 'Rationale for option A',
    recommended: overrides.recommended,
    isNew: overrides.isNew,
  };
}

function makeQuestion(
  overrides: Partial<{
    id: string;
    question: string;
    options: ReturnType<typeof makeOption>[];
  }> = {}
) {
  return {
    id: overrides.id ?? 'q-1',
    question: overrides.question ?? 'What problem does this solve?',
    type: 'select' as const,
    options: overrides.options ?? [
      makeOption({ id: 'opt-a', label: 'Pain Point', recommended: true }),
      makeOption({ id: 'opt-b', label: 'Feature Gap' }),
      makeOption({ id: 'opt-c', label: 'Technical Debt', isNew: true }),
    ],
  };
}

const defaultProps: PrdQuestionnaireProps = {
  data: {
    question: 'Review Requirements',
    context: 'Please review and refine the generated requirements.',
    questions: [
      makeQuestion({ id: 'q-1', question: 'What problem does this solve?' }),
      makeQuestion({ id: 'q-2', question: 'What is the priority?' }),
    ],
    finalAction: {
      id: 'approve',
      label: 'Approve Requirements',
      description: 'Finalize the requirements',
    },
  },
  selections: {},
  onSelect: vi.fn(),
  onRefine: vi.fn(),
  onApprove: vi.fn(),
};

describe('PrdQuestionnaire', () => {
  describe('header rendering', () => {
    it('renders header with amber dot, question title, and context', () => {
      render(<PrdQuestionnaire {...defaultProps} />);

      expect(screen.getByText('Review Requirements')).toBeInTheDocument();
      expect(
        screen.getByText('Please review and refine the generated requirements.')
      ).toBeInTheDocument();
      // Amber dot
      const heading = screen.getByText('Review Requirements').closest('.flex');
      const dot = heading?.parentElement?.querySelector('.bg-amber-500');
      expect(dot).toBeInTheDocument();
    });
  });

  describe('question rendering', () => {
    it('renders correct number of questions', () => {
      render(<PrdQuestionnaire {...defaultProps} />);

      expect(screen.getByText(/1\. What problem does this solve\?/)).toBeInTheDocument();
      expect(screen.getByText(/2\. What is the priority\?/)).toBeInTheDocument();
    });

    it('renders options as button elements with letter prefixes', () => {
      render(<PrdQuestionnaire {...defaultProps} />);

      const buttons = screen.getAllByRole('button', {
        name: /Pain Point|Feature Gap|Technical Debt/i,
      });
      expect(buttons.length).toBeGreaterThanOrEqual(2);

      // Check letter prefix exists
      expect(screen.getAllByText('A.').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('B.').length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('badge rendering', () => {
    it('renders AI Recommended badge when recommended=true', () => {
      render(<PrdQuestionnaire {...defaultProps} />);

      const badges = screen.getAllByText('AI Recommended');
      expect(badges.length).toBeGreaterThanOrEqual(1);
    });

    it('renders New badge when isNew=true', () => {
      render(<PrdQuestionnaire {...defaultProps} />);

      const badges = screen.getAllByText('New');
      expect(badges.length).toBeGreaterThanOrEqual(1);
    });

    it('applies animate-option-highlight class when isNew=true', () => {
      render(<PrdQuestionnaire {...defaultProps} />);

      // Find a button containing "Technical Debt" which has isNew
      const newButton = screen
        .getAllByRole('button')
        .find((btn) => btn.textContent?.includes('Technical Debt'));
      expect(newButton).toHaveClass('animate-option-highlight');
    });
  });

  describe('selection state', () => {
    it('highlights selected option with border-primary', () => {
      render(<PrdQuestionnaire {...defaultProps} selections={{ 'q-1': 'opt-a' }} />);

      // Find the button for "Pain Point" in q-1
      const buttons = screen
        .getAllByRole('button')
        .filter((btn) => btn.textContent?.includes('Pain Point'));
      const selectedButton = buttons[0];
      expect(selectedButton).toHaveClass('border-primary');
    });
  });

  describe('callbacks', () => {
    it('calls onSelect(questionId, optionId) when option clicked', () => {
      const onSelect = vi.fn();
      render(<PrdQuestionnaire {...defaultProps} onSelect={onSelect} />);

      // Click the first "Pain Point" button
      const button = screen
        .getAllByRole('button')
        .find((btn) => btn.textContent?.includes('Pain Point'));
      fireEvent.click(button!);

      expect(onSelect).toHaveBeenCalledWith('q-1', 'opt-a');
    });

    it('chat input submit calls onRefine with input text', () => {
      const onRefine = vi.fn();
      render(<PrdQuestionnaire {...defaultProps} onRefine={onRefine} />);

      const input = screen.getByLabelText('Ask AI to refine requirements');
      fireEvent.change(input, { target: { value: 'Make it simpler' } });

      const sendButton = screen.getByRole('button', { name: /send/i });
      fireEvent.click(sendButton);

      expect(onRefine).toHaveBeenCalledWith('Make it simpler');
    });

    it('approve button calls onApprove with finalAction.id', () => {
      const onApprove = vi.fn();
      render(<PrdQuestionnaire {...defaultProps} onApprove={onApprove} />);

      const approveButton = screen.getByRole('button', { name: /approve requirements/i });
      fireEvent.click(approveButton);

      expect(onApprove).toHaveBeenCalledWith('approve');
    });
  });

  describe('progress bar', () => {
    it('progress bar width reflects selections/questions ratio', () => {
      render(<PrdQuestionnaire {...defaultProps} selections={{ 'q-1': 'opt-a' }} />);

      const progressBar = screen.getByTestId('progress-bar');
      expect(progressBar).toHaveStyle({ width: '50%' });
    });

    it('progress bar hidden when no selections and not processing', () => {
      render(<PrdQuestionnaire {...defaultProps} />);

      const container = screen.getByTestId('progress-bar-container');
      expect(container).toHaveClass('opacity-0');
    });

    it('progress bar visible when selections exist', () => {
      render(<PrdQuestionnaire {...defaultProps} selections={{ 'q-1': 'opt-a' }} />);

      const container = screen.getByTestId('progress-bar-container');
      expect(container).toHaveClass('opacity-100');
    });
  });

  describe('processing state', () => {
    it('isProcessing=true disables all interactive elements', () => {
      render(<PrdQuestionnaire {...defaultProps} isProcessing />);

      const allButtons = screen.getAllByRole('button');
      allButtons.forEach((button) => {
        expect(button).toBeDisabled();
      });

      const input = screen.getByLabelText('Ask AI to refine requirements');
      expect(input).toBeDisabled();
    });
  });

  describe('accessibility', () => {
    it('chat input has aria-label attribute', () => {
      render(<PrdQuestionnaire {...defaultProps} />);

      const input = screen.getByLabelText('Ask AI to refine requirements');
      expect(input).toHaveAttribute('aria-label', 'Ask AI to refine requirements');
    });
  });
});
