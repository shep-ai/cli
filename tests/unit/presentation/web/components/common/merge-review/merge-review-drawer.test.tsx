import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PrStatus, CiStatus } from '@shepai/core/domain/generated/output';
import { MergeReviewDrawer } from '@/components/common/merge-review/merge-review-drawer';
import type { MergeReviewDrawerProps } from '@/components/common/merge-review/merge-review-config';

const defaultProps: MergeReviewDrawerProps = {
  open: true,
  onClose: vi.fn(),
  featureName: 'Test Feature',
  featureId: 'feat-123',
  repositoryPath: '/path/to/repo',
  branch: 'feat/test',
  specPath: '/path/to/specs',
  data: {
    pr: {
      url: 'https://github.com/org/repo/pull/42',
      number: 42,
      status: PrStatus.Open,
      ciStatus: CiStatus.Success,
      commitHash: 'abc1234',
    },
    diffSummary: {
      filesChanged: 5,
      additions: 100,
      deletions: 20,
      commitCount: 2,
    },
  },
  onApprove: vi.fn(),
  onReject: vi.fn(),
};

describe('MergeReviewDrawer', () => {
  it('renders ReviewDrawerShell with feature metadata and MergeReview content', () => {
    render(<MergeReviewDrawer {...defaultProps} />);

    // Shell renders the feature name in the header
    expect(screen.getByText('Test Feature')).toBeInTheDocument();
    // MergeReview content renders the PR link
    expect(screen.getByRole('link', { name: /PR #42/i })).toBeInTheDocument();
    // MergeReview content renders the approve button
    expect(screen.getByRole('button', { name: /approve merge/i })).toBeInTheDocument();
  });
});
