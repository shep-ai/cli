import { describe, it, expectTypeOf, vi } from 'vitest';
import { PrStatus, CiStatus } from '@shepai/core/domain/generated/output';
import type {
  MergeReviewData,
  MergeReviewProps,
  MergeReviewDrawerProps,
  MergeReviewPhase,
  MergeReviewBranch,
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
      branch: { source: 'feat/x', target: 'main' },
      phases: [{ id: 'p1', name: 'Foundation' }],
    };

    expectTypeOf(data).toMatchTypeOf<MergeReviewData>();
  });

  it('accepts data without optional fields', () => {
    const data: MergeReviewData = {};

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

  it('accepts data without PR (no-PR merge)', () => {
    const data: MergeReviewData = {
      branch: { source: 'feat/x', target: 'main' },
      diffSummary: { filesChanged: 5, additions: 100, deletions: 20, commitCount: 2 },
    };

    expectTypeOf(data).toMatchTypeOf<MergeReviewData>();
  });
});

describe('MergeReviewPhase interface', () => {
  it('accepts phase with description', () => {
    const phase: MergeReviewPhase = { id: 'p1', name: 'Foundation', description: 'Set up types' };

    expectTypeOf(phase).toMatchTypeOf<MergeReviewPhase>();
  });

  it('accepts phase without description', () => {
    const phase: MergeReviewPhase = { id: 'p1', name: 'Foundation' };

    expectTypeOf(phase).toMatchTypeOf<MergeReviewPhase>();
  });
});

describe('MergeReviewBranch interface', () => {
  it('has source and target fields', () => {
    const branch: MergeReviewBranch = { source: 'feat/x', target: 'main' };

    expectTypeOf(branch).toMatchTypeOf<MergeReviewBranch>();
  });
});

describe('MergeReviewProps interface', () => {
  it('accepts props with data, onApprove, onReject, and isProcessing', () => {
    const props: MergeReviewProps = {
      data: {
        pr: {
          url: 'https://github.com/org/repo/pull/42',
          number: 42,
          status: PrStatus.Open,
        },
      },
      onApprove: vi.fn(),
      onReject: vi.fn(),
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
      onReject: vi.fn(),
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
      onReject: vi.fn(),
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
      data: {},
      onApprove: vi.fn(),
      onReject: vi.fn(),
      open: false,
      onClose: vi.fn(),
      featureName: 'My Feature',
    };

    expectTypeOf(props).toMatchTypeOf<MergeReviewDrawerProps>();
  });
});
