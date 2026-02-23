import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PrStatus, CiStatus } from '@shepai/core/domain/generated/output';
import { MergeReview } from '@/components/common/merge-review/merge-review';
import type { MergeReviewProps } from '@/components/common/merge-review/merge-review-config';

const baseProps: MergeReviewProps = {
  data: {
    pr: {
      url: 'https://github.com/org/repo/pull/42',
      number: 42,
      status: PrStatus.Open,
      commitHash: 'abc1234def5678',
      ciStatus: CiStatus.Success,
    },
    diffSummary: {
      filesChanged: 10,
      additions: 200,
      deletions: 50,
      commitCount: 3,
    },
  },
  onApprove: vi.fn(),
};

describe('MergeReview', () => {
  describe('PR link', () => {
    it('renders PR number as clickable external link with correct href and target', () => {
      render(<MergeReview {...baseProps} />);

      const link = screen.getByRole('link', { name: /PR #42/i });
      expect(link).toHaveAttribute('href', 'https://github.com/org/repo/pull/42');
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });
  });

  describe('PR status', () => {
    it('displays PR status text', () => {
      render(<MergeReview {...baseProps} />);

      expect(screen.getByText('Open')).toBeInTheDocument();
    });
  });

  describe('CI status badge', () => {
    it('renders green badge with "Passing" text for CiStatus.Success', () => {
      render(<MergeReview {...baseProps} />);

      expect(screen.getByText('Passing')).toBeInTheDocument();
    });

    it('renders yellow badge with "Pending" text for CiStatus.Pending', () => {
      const props: MergeReviewProps = {
        ...baseProps,
        data: {
          ...baseProps.data,
          pr: { ...baseProps.data.pr, ciStatus: CiStatus.Pending },
        },
      };
      render(<MergeReview {...props} />);

      expect(screen.getByText('Pending')).toBeInTheDocument();
    });

    it('renders red badge with "Failing" text for CiStatus.Failure', () => {
      const props: MergeReviewProps = {
        ...baseProps,
        data: {
          ...baseProps.data,
          pr: { ...baseProps.data.pr, ciStatus: CiStatus.Failure },
        },
      };
      render(<MergeReview {...props} />);

      expect(screen.getByText('Failing')).toBeInTheDocument();
    });

    it('omits CI section entirely when ciStatus is undefined', () => {
      const props: MergeReviewProps = {
        ...baseProps,
        data: {
          ...baseProps.data,
          pr: { ...baseProps.data.pr, ciStatus: undefined },
        },
      };
      render(<MergeReview {...props} />);

      expect(screen.queryByText('Passing')).not.toBeInTheDocument();
      expect(screen.queryByText('Pending')).not.toBeInTheDocument();
      expect(screen.queryByText('Failing')).not.toBeInTheDocument();
      expect(screen.queryByText('CI Status')).not.toBeInTheDocument();
    });
  });

  describe('diff summary', () => {
    it('renders diff stats with correct formatting when available', () => {
      render(<MergeReview {...baseProps} />);

      expect(screen.getByText('10')).toBeInTheDocument();
      expect(screen.getByText('+200')).toBeInTheDocument();
      expect(screen.getByText('-50')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('shows warning message when diffSummary is absent and warning is set', () => {
      const props: MergeReviewProps = {
        ...baseProps,
        data: {
          pr: baseProps.data.pr,
          warning: 'Diff statistics unavailable',
        },
      };
      render(<MergeReview {...props} />);

      expect(screen.getByText('Diff statistics unavailable')).toBeInTheDocument();
      expect(screen.queryByText('+200')).not.toBeInTheDocument();
    });
  });

  describe('commit hash', () => {
    it('displays truncated commit hash (7 chars) when available', () => {
      render(<MergeReview {...baseProps} />);

      expect(screen.getByText('abc1234')).toBeInTheDocument();
    });

    it('does not show commit hash section when commitHash is undefined', () => {
      const props: MergeReviewProps = {
        ...baseProps,
        data: {
          ...baseProps.data,
          pr: { ...baseProps.data.pr, commitHash: undefined },
        },
      };
      render(<MergeReview {...props} />);

      expect(screen.queryByText('abc1234')).not.toBeInTheDocument();
    });
  });

  describe('approve button', () => {
    it('renders "Approve Merge" button that calls onApprove', () => {
      const onApprove = vi.fn();
      render(<MergeReview {...baseProps} onApprove={onApprove} />);

      const button = screen.getByRole('button', { name: /approve merge/i });
      fireEvent.click(button);

      expect(onApprove).toHaveBeenCalledTimes(1);
    });

    it('disables approve button when isProcessing is true', () => {
      render(<MergeReview {...baseProps} isProcessing />);

      const button = screen.getByRole('button', { name: /approve merge/i });
      expect(button).toBeDisabled();
    });
  });
});
