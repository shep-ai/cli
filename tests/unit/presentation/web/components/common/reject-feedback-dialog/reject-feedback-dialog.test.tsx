import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RejectFeedbackDialog } from '@/components/common/reject-feedback-dialog';

describe('RejectFeedbackDialog', () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    onConfirm: vi.fn(),
    isSubmitting: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('visibility', () => {
    it('renders dialog content when open is true', () => {
      render(<RejectFeedbackDialog {...defaultProps} />);
      expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    });

    it('does not render dialog content when open is false', () => {
      render(<RejectFeedbackDialog {...defaultProps} open={false} />);
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    });
  });

  describe('content', () => {
    it('renders default title', () => {
      render(<RejectFeedbackDialog {...defaultProps} />);
      expect(screen.getByText('Reject Requirements')).toBeInTheDocument();
    });

    it('renders custom title when provided', () => {
      render(<RejectFeedbackDialog {...defaultProps} title="Reject Plan" />);
      expect(screen.getByText('Reject Plan')).toBeInTheDocument();
    });

    it('renders default description', () => {
      render(<RejectFeedbackDialog {...defaultProps} />);
      expect(
        screen.getByText(/Provide feedback for the agent to address in the next iteration/)
      ).toBeInTheDocument();
    });

    it('renders custom description when provided', () => {
      render(
        <RejectFeedbackDialog {...defaultProps} description="Explain what needs to change." />
      );
      expect(screen.getByText('Explain what needs to change.')).toBeInTheDocument();
    });

    it('renders textarea with aria-label', () => {
      render(<RejectFeedbackDialog {...defaultProps} />);
      expect(screen.getByLabelText('Rejection feedback')).toBeInTheDocument();
    });
  });

  describe('confirm button state', () => {
    it('is disabled when feedback is empty', () => {
      render(<RejectFeedbackDialog {...defaultProps} />);
      expect(screen.getByRole('button', { name: /confirm reject/i })).toBeDisabled();
    });

    it('is disabled when feedback is whitespace only', async () => {
      const user = userEvent.setup();
      render(<RejectFeedbackDialog {...defaultProps} />);
      await user.type(screen.getByLabelText('Rejection feedback'), '   ');
      expect(screen.getByRole('button', { name: /confirm reject/i })).toBeDisabled();
    });

    it('is enabled when feedback has content', async () => {
      const user = userEvent.setup();
      render(<RejectFeedbackDialog {...defaultProps} />);
      await user.type(screen.getByLabelText('Rejection feedback'), 'Please fix the requirements');
      expect(screen.getByRole('button', { name: /confirm reject/i })).toBeEnabled();
    });

    it('is disabled when isSubmitting is true', async () => {
      const user = userEvent.setup();
      render(<RejectFeedbackDialog {...defaultProps} isSubmitting />);
      await user.type(screen.getByLabelText('Rejection feedback'), 'Some feedback');
      expect(screen.getByRole('button', { name: /rejecting/i })).toBeDisabled();
    });

    it('shows spinner when isSubmitting is true', () => {
      render(<RejectFeedbackDialog {...defaultProps} isSubmitting />);
      const button = screen.getByRole('button', { name: /rejecting/i });
      expect(button.querySelector('.animate-spin')).toBeInTheDocument();
    });
  });

  describe('confirm action', () => {
    it('calls onConfirm with trimmed feedback on confirm click', async () => {
      const user = userEvent.setup();
      const onConfirm = vi.fn();
      render(<RejectFeedbackDialog {...defaultProps} onConfirm={onConfirm} />);
      await user.type(screen.getByLabelText('Rejection feedback'), '  Fix the naming  ');
      await user.click(screen.getByRole('button', { name: /confirm reject/i }));
      expect(onConfirm).toHaveBeenCalledWith('Fix the naming');
    });
  });

  describe('cancel action', () => {
    it('calls onOpenChange(false) when cancel is clicked', async () => {
      const user = userEvent.setup();
      const onOpenChange = vi.fn();
      render(<RejectFeedbackDialog {...defaultProps} onOpenChange={onOpenChange} />);
      await user.click(screen.getByRole('button', { name: /cancel/i }));
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    it('cancel button is disabled when isSubmitting is true', () => {
      render(<RejectFeedbackDialog {...defaultProps} isSubmitting />);
      expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled();
    });
  });

  describe('feedback reset', () => {
    it('resets feedback when dialog reopens', async () => {
      const user = userEvent.setup();
      const { rerender } = render(<RejectFeedbackDialog {...defaultProps} />);

      // Type some feedback
      await user.type(screen.getByLabelText('Rejection feedback'), 'Some feedback');
      expect(screen.getByLabelText('Rejection feedback')).toHaveValue('Some feedback');

      // Close dialog
      rerender(<RejectFeedbackDialog {...defaultProps} open={false} />);

      // Reopen dialog
      rerender(<RejectFeedbackDialog {...defaultProps} open={true} />);

      // Feedback should be empty
      expect(screen.getByLabelText('Rejection feedback')).toHaveValue('');
    });
  });
});
