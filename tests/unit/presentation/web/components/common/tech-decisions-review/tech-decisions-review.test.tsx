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
    it('does not render revision input when onReject is undefined', () => {
      render(<TechDecisionsReview {...defaultProps} />);

      expect(screen.queryByLabelText('Ask AI to revise the plan...')).not.toBeInTheDocument();
    });

    it('renders revision input in action bar when onReject is provided', () => {
      const onReject = vi.fn();
      render(<TechDecisionsReview {...defaultProps} onReject={onReject} />);

      expect(screen.getByLabelText('Ask AI to revise the plan...')).toBeInTheDocument();
    });

    it('revision input is disabled when isRejecting is true', () => {
      const onReject = vi.fn();
      render(<TechDecisionsReview {...defaultProps} onReject={onReject} isRejecting />);

      expect(screen.getByLabelText('Ask AI to revise the plan...')).toBeDisabled();
    });

    it('revision input is disabled when isProcessing is true', () => {
      const onReject = vi.fn();
      render(<TechDecisionsReview {...defaultProps} onReject={onReject} isProcessing />);

      expect(screen.getByLabelText('Ask AI to revise the plan...')).toBeDisabled();
    });

    it('submitting revision input calls onReject with feedback', () => {
      const onReject = vi.fn();
      render(<TechDecisionsReview {...defaultProps} onReject={onReject} />);

      const input = screen.getByLabelText('Ask AI to revise the plan...');
      fireEvent.change(input, { target: { value: 'Reconsider the database' } });
      fireEvent.click(screen.getByRole('button', { name: /send/i }));

      expect(onReject).toHaveBeenCalledWith('Reconsider the database');
    });

    it('approve button is disabled when isRejecting is true', () => {
      const onReject = vi.fn();
      render(<TechDecisionsReview {...defaultProps} onReject={onReject} isRejecting />);

      expect(screen.getByRole('button', { name: /approve plan/i })).toBeDisabled();
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

      const input = screen.getByLabelText('Ask AI to revise the plan...');
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
      const onReject = vi.fn();
      render(<TechDecisionsReview {...defaultProps} onReject={onReject} isProcessing />);

      expect(screen.getByLabelText('Ask AI to revise the plan...')).toBeDisabled();
      expect(screen.getByRole('button', { name: /send/i })).toBeDisabled();
    });
  });
});
