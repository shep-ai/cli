import { describe, it, expectTypeOf, vi } from 'vitest';
import { PrStatus, CiStatus } from '@shepai/core/domain/generated/output';
import type {
  MergeReviewData,
  MergeReviewProps,
  MergeReviewDrawerProps,
} from '../../../../../../../src/presentation/web/components/common/merge-review/merge-review-config';

describe('MergeReviewData interface', () => {
  it('accepts a complete data object with all fields', () => {
    const data: MergeReviewData = {
      pr: {
        url: 'https://github.com/org/repo/pull/42',
        number: 42,
        status: PrStatus.Open,
        commitHash: 'abc1234',
        ciStatus: CiStatus.Success,
      },
      diffSummary: {
        filesChanged: 10,
        additions: 200,
        deletions: 50,
        commitCount: 3,
      },
    };

    expectTypeOf(data).toMatchTypeOf<MergeReviewData>();
  });

  it('accepts data without optional fields', () => {
    const data: MergeReviewData = {
      pr: {
        url: 'https://github.com/org/repo/pull/42',
        number: 42,
        status: PrStatus.Open,
      },
    };

    expectTypeOf(data).toMatchTypeOf<MergeReviewData>();
  });

  it('accepts data with warning and no diffSummary (degraded state)', () => {
    const data: MergeReviewData = {
      pr: {
        url: 'https://github.com/org/repo/pull/42',
        number: 42,
        status: PrStatus.Merged,
      },
      warning: 'Diff statistics unavailable',
    };

    expectTypeOf(data).toMatchTypeOf<MergeReviewData>();
  });
});

describe('MergeReviewProps interface', () => {
  it('accepts props with data, onApprove, and isProcessing', () => {
    const props: MergeReviewProps = {
      data: {
        pr: {
          url: 'https://github.com/org/repo/pull/42',
          number: 42,
          status: PrStatus.Open,
        },
      },
      onApprove: vi.fn(),
      isProcessing: true,
    };

    expectTypeOf(props).toMatchTypeOf<MergeReviewProps>();
  });

  it('accepts props without optional isProcessing', () => {
    const props: MergeReviewProps = {
      data: {
        pr: {
          url: 'https://github.com/org/repo/pull/42',
          number: 42,
          status: PrStatus.Open,
        },
      },
      onApprove: vi.fn(),
    };

    expectTypeOf(props).toMatchTypeOf<MergeReviewProps>();
  });
});

describe('MergeReviewDrawerProps interface', () => {
  it('accepts complete drawer props extending MergeReviewProps', () => {
    const props: MergeReviewDrawerProps = {
      data: {
        pr: {
          url: 'https://github.com/org/repo/pull/42',
          number: 42,
          status: PrStatus.Open,
        },
      },
      onApprove: vi.fn(),
      open: true,
      onClose: vi.fn(),
      featureName: 'My Feature',
      featureId: 'feat-123',
      repositoryPath: '/path/to/repo',
      branch: 'feat/branch',
      specPath: '/path/to/specs',
      onDelete: vi.fn(),
      isDeleting: false,
    };

    expectTypeOf(props).toMatchTypeOf<MergeReviewDrawerProps>();
  });

  it('accepts drawer props with only required fields', () => {
    const props: MergeReviewDrawerProps = {
      data: {
        pr: {
          url: 'https://github.com/org/repo/pull/42',
          number: 42,
          status: PrStatus.Open,
        },
      },
      onApprove: vi.fn(),
      open: false,
      onClose: vi.fn(),
      featureName: 'My Feature',
    };

    expectTypeOf(props).toMatchTypeOf<MergeReviewDrawerProps>();
  });
});
