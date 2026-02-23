import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TechDecisionsReview } from '@/components/common/tech-decisions-review';
import type { TechDecisionsReviewProps } from '@/components/common/tech-decisions-review';

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
      {
        title: 'API Framework',
        chosen: 'Express',
        rationale: 'Lightweight and flexible',
        rejected: ['Fastify'],
      },
    ],
    technologies: ['TypeScript', 'Node.js'],
  },
  onApprove: vi.fn(),
};

describe('TechDecisionsReview', () => {
  describe('basic rendering', () => {
    it('renders header and decision cards', () => {
      render(<TechDecisionsReview {...defaultProps} />);

      expect(screen.getByText('Technical Implementation Plan Review')).toBeInTheDocument();
      expect(screen.getByText('Database Choice')).toBeInTheDocument();
      expect(screen.getByText('API Framework')).toBeInTheDocument();
    });

    it('renders approve button', () => {
      render(<TechDecisionsReview {...defaultProps} />);

      expect(screen.getByRole('button', { name: /approve plan/i })).toBeInTheDocument();
    });

    it('returns null when decisions array is empty', () => {
      const { container } = render(
        <TechDecisionsReview {...defaultProps} data={{ ...defaultProps.data, decisions: [] }} />
      );

      expect(container.firstChild).toBeNull();
    });
  });

  describe('reject functionality', () => {
    it('does not render reject button when onReject is undefined', () => {
      render(<TechDecisionsReview {...defaultProps} />);

      expect(screen.queryByRole('button', { name: /reject/i })).not.toBeInTheDocument();
    });

    it('renders reject button in action bar when onReject is provided', () => {
      const onReject = vi.fn();
      render(<TechDecisionsReview {...defaultProps} onReject={onReject} />);

      expect(screen.getByRole('button', { name: /reject/i })).toBeInTheDocument();
    });

    it('reject button is disabled when isRejecting is true', () => {
      const onReject = vi.fn();
      render(<TechDecisionsReview {...defaultProps} onReject={onReject} isRejecting />);

      expect(screen.getByRole('button', { name: /reject/i })).toBeDisabled();
    });

    it('reject button is disabled when isProcessing is true', () => {
      const onReject = vi.fn();
      render(<TechDecisionsReview {...defaultProps} onReject={onReject} isProcessing />);

      expect(screen.getByRole('button', { name: /reject/i })).toBeDisabled();
    });

    it('clicking reject opens the AlertDialog with "Reject Plan" title', () => {
      const onReject = vi.fn();
      render(<TechDecisionsReview {...defaultProps} onReject={onReject} />);

      fireEvent.click(screen.getByRole('button', { name: /reject/i }));

      expect(screen.getByText('Reject Plan')).toBeInTheDocument();
      expect(screen.getByLabelText('Rejection feedback')).toBeInTheDocument();
    });

    it('confirming dialog calls onReject with feedback', () => {
      const onReject = vi.fn();
      render(<TechDecisionsReview {...defaultProps} onReject={onReject} />);

      fireEvent.click(screen.getByRole('button', { name: /reject/i }));

      const textarea = screen.getByLabelText('Rejection feedback');
      fireEvent.change(textarea, { target: { value: 'Reconsider the database' } });

      fireEvent.click(screen.getByRole('button', { name: /confirm reject/i }));

      expect(onReject).toHaveBeenCalledWith('Reconsider the database');
    });

    it('approve button is disabled when isRejecting is true', () => {
      const onReject = vi.fn();
      render(<TechDecisionsReview {...defaultProps} onReject={onReject} isRejecting />);

      expect(screen.getByRole('button', { name: /approve plan/i })).toBeDisabled();
    });

    it('approve button takes remaining space with flex-1', () => {
      const onReject = vi.fn();
      render(<TechDecisionsReview {...defaultProps} onReject={onReject} />);

      const approveButton = screen.getByRole('button', { name: /approve plan/i });
      expect(approveButton).toHaveClass('flex-1');
    });
  });

  describe('callbacks', () => {
    it('calls onApprove when approve button is clicked', () => {
      const onApprove = vi.fn();
      render(<TechDecisionsReview {...defaultProps} onApprove={onApprove} />);

      fireEvent.click(screen.getByRole('button', { name: /approve plan/i }));

      expect(onApprove).toHaveBeenCalledOnce();
    });

    it('chat input submit calls onReject with input text', () => {
      const onReject = vi.fn();
      render(<TechDecisionsReview {...defaultProps} onReject={onReject} />);

      const input = screen.getByLabelText('Ask AI to revise the plan');
      fireEvent.change(input, { target: { value: 'Add caching layer' } });

      const sendButton = screen.getByRole('button', { name: /send/i });
      fireEvent.click(sendButton);

      expect(onReject).toHaveBeenCalledWith('Add caching layer');
    });
  });

  describe('processing state', () => {
    it('disables approve button when isProcessing is true', () => {
      render(<TechDecisionsReview {...defaultProps} isProcessing />);

      expect(screen.getByRole('button', { name: /approve plan/i })).toBeDisabled();
    });

    it('disables chat input and send button when isProcessing is true', () => {
      render(<TechDecisionsReview {...defaultProps} isProcessing />);

      expect(screen.getByLabelText('Ask AI to revise the plan')).toBeDisabled();
      expect(screen.getByRole('button', { name: /send/i })).toBeDisabled();
    });
  });
});
