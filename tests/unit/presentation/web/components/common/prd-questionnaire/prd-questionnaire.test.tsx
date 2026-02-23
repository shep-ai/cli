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
  onApprove: vi.fn(),
};

describe('PrdQuestionnaire', () => {
  describe('header rendering', () => {
    it('hides header by default (showHeader=false)', () => {
      render(<PrdQuestionnaire {...defaultProps} />);

      // Header is hidden by default
      expect(screen.queryByText('Review Requirements')).not.toBeInTheDocument();
    });

    it('renders header with amber dot, question title, and context when showHeader=true', () => {
      render(<PrdQuestionnaire {...defaultProps} showHeader />);

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
    it('renders the current question and step dots', () => {
      render(<PrdQuestionnaire {...defaultProps} />);

      // First question visible on step 1
      expect(screen.getByText('What problem does this solve?')).toBeInTheDocument();
      // Step dots (one per question)
      const stepDots = screen.getAllByRole('button', { name: /Go to question/ });
      expect(stepDots).toHaveLength(2);
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

    it('chat input submit calls onReject with input text', () => {
      const onReject = vi.fn();
      render(<PrdQuestionnaire {...defaultProps} onReject={onReject} />);

      const input = screen.getByLabelText('Ask AI to refine requirements...');
      fireEvent.change(input, { target: { value: 'Make it simpler' } });

      const sendButton = screen.getByRole('button', { name: /send/i });
      fireEvent.click(sendButton);

      expect(onReject).toHaveBeenCalledWith('Make it simpler');
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
    it('isProcessing=true disables option buttons, nav buttons, and chat input', () => {
      const onReject = vi.fn();
      render(<PrdQuestionnaire {...defaultProps} onReject={onReject} isProcessing />);

      // Option buttons are disabled
      const optionButtons = screen
        .getAllByRole('button')
        .filter(
          (btn) =>
            btn.textContent?.includes('Pain Point') ||
            btn.textContent?.includes('Feature Gap') ||
            btn.textContent?.includes('Technical Debt')
        );
      optionButtons.forEach((button) => {
        expect(button).toBeDisabled();
      });

      // Previous button is disabled
      const prevButton = screen.getByRole('button', { name: /previous/i });
      expect(prevButton).toBeDisabled();

      // Send button is disabled
      const sendButton = screen.getByRole('button', { name: /send/i });
      expect(sendButton).toBeDisabled();

      // Chat input is disabled
      const input = screen.getByLabelText('Ask AI to refine requirements...');
      expect(input).toBeDisabled();
    });
  });

  describe('reject functionality', () => {
    it('does not render reject button when onReject is undefined', () => {
      // Navigate to last step
      const allSelections = { 'q-1': 'opt-a', 'q-2': 'opt-a' };
      render(<PrdQuestionnaire {...defaultProps} selections={allSelections} />);

      const stepDots = screen.getAllByRole('button', { name: /Go to question/ });
      fireEvent.click(stepDots[stepDots.length - 1]);

      expect(screen.queryByRole('button', { name: /reject/i })).not.toBeInTheDocument();
    });

    it('renders reject button on last step when onReject is provided', () => {
      const onReject = vi.fn();
      const allSelections = { 'q-1': 'opt-a', 'q-2': 'opt-a' };
      render(<PrdQuestionnaire {...defaultProps} onReject={onReject} selections={allSelections} />);

      const stepDots = screen.getAllByRole('button', { name: /Go to question/ });
      fireEvent.click(stepDots[stepDots.length - 1]);

      expect(screen.getByRole('button', { name: /reject/i })).toBeInTheDocument();
    });

    it('renders reject button on all steps when onReject is provided', () => {
      const onReject = vi.fn();
      render(<PrdQuestionnaire {...defaultProps} onReject={onReject} />);

      // Reject button is always visible in the action bar
      expect(screen.getByRole('button', { name: /reject/i })).toBeInTheDocument();
    });

    it('reject button is disabled when isRejecting is true', () => {
      const onReject = vi.fn();
      const allSelections = { 'q-1': 'opt-a', 'q-2': 'opt-a' };
      render(
        <PrdQuestionnaire
          {...defaultProps}
          onReject={onReject}
          isRejecting
          selections={allSelections}
        />
      );

      const stepDots = screen.getAllByRole('button', { name: /Go to question/ });
      fireEvent.click(stepDots[stepDots.length - 1]);

      expect(screen.getByRole('button', { name: /reject/i })).toBeDisabled();
    });

    it('reject button is disabled when isProcessing is true', () => {
      const onReject = vi.fn();
      const allSelections = { 'q-1': 'opt-a', 'q-2': 'opt-a' };
      render(
        <PrdQuestionnaire
          {...defaultProps}
          onReject={onReject}
          isProcessing
          selections={allSelections}
        />
      );

      const stepDots = screen.getAllByRole('button', { name: /Go to question/ });
      fireEvent.click(stepDots[stepDots.length - 1]);

      expect(screen.getByRole('button', { name: /reject/i })).toBeDisabled();
    });

    it('clicking reject opens the AlertDialog', () => {
      const onReject = vi.fn();
      const allSelections = { 'q-1': 'opt-a', 'q-2': 'opt-a' };
      render(<PrdQuestionnaire {...defaultProps} onReject={onReject} selections={allSelections} />);

      const stepDots = screen.getAllByRole('button', { name: /Go to question/ });
      fireEvent.click(stepDots[stepDots.length - 1]);

      fireEvent.click(screen.getByRole('button', { name: /reject/i }));

      expect(screen.getByText('Reject Requirements')).toBeInTheDocument();
      expect(screen.getByLabelText('Rejection feedback')).toBeInTheDocument();
    });

    it('confirming dialog calls onReject with feedback', () => {
      const onReject = vi.fn();
      const allSelections = { 'q-1': 'opt-a', 'q-2': 'opt-a' };
      render(<PrdQuestionnaire {...defaultProps} onReject={onReject} selections={allSelections} />);

      const stepDots = screen.getAllByRole('button', { name: /Go to question/ });
      fireEvent.click(stepDots[stepDots.length - 1]);

      fireEvent.click(screen.getByRole('button', { name: /reject/i }));

      const textarea = screen.getByLabelText('Rejection feedback');
      fireEvent.change(textarea, { target: { value: 'Needs more detail' } });

      fireEvent.click(screen.getByRole('button', { name: /confirm reject/i }));

      expect(onReject).toHaveBeenCalledWith('Needs more detail');
    });

    it('approve button is disabled when isRejecting is true', () => {
      const onReject = vi.fn();
      render(<PrdQuestionnaire {...defaultProps} onReject={onReject} isRejecting />);

      expect(screen.getByRole('button', { name: /approve requirements/i })).toBeDisabled();
    });
  });

  describe('accessibility', () => {
    it('chat input has aria-label attribute when onReject is provided', () => {
      const onReject = vi.fn();
      render(<PrdQuestionnaire {...defaultProps} onReject={onReject} />);

      const input = screen.getByLabelText('Ask AI to refine requirements...');
      expect(input).toHaveAttribute('aria-label', 'Ask AI to refine requirements...');
    });
  });
});
