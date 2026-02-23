import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PrStatus, CiStatus } from '@shepai/core/domain/generated/output';

const mockFindById = vi.fn();
const mockGetPrDiffSummary = vi.fn();

vi.mock('@/lib/server-container', () => ({
  resolve: (token: string) => {
    if (token === 'IFeatureRepository') return { findById: mockFindById };
    if (token === 'IGitPrService') return { getPrDiffSummary: mockGetPrDiffSummary };
    throw new Error(`Unknown token: ${token}`);
  },
}));

const { getMergeReviewData } = await import(
  '../../../../../../src/presentation/web/app/actions/get-merge-review-data.js'
);

const basePr = {
  url: 'https://github.com/org/repo/pull/42',
  number: 42,
  status: PrStatus.Open,
  commitHash: 'abc1234def',
  ciStatus: CiStatus.Success,
};

const baseFeature = {
  id: 'feat-123',
  name: 'Test Feature',
  worktreePath: '/tmp/worktree',
  pr: basePr,
};

const baseDiffSummary = {
  filesChanged: 10,
  additions: 200,
  deletions: 50,
  commitCount: 3,
};

describe('getMergeReviewData server action', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns error when featureId is empty string', async () => {
    const result = await getMergeReviewData('');

    expect(result).toEqual({ error: 'Feature id is required' });
    expect(mockFindById).not.toHaveBeenCalled();
  });

  it('returns error when featureId is whitespace-only', async () => {
    const result = await getMergeReviewData('   ');

    expect(result).toEqual({ error: 'Feature id is required' });
    expect(mockFindById).not.toHaveBeenCalled();
  });

  it('returns error when feature is not found', async () => {
    mockFindById.mockResolvedValue(null);

    const result = await getMergeReviewData('nonexistent');

    expect(result).toEqual({ error: 'Feature not found' });
  });

  it('returns error when feature has no PR data', async () => {
    mockFindById.mockResolvedValue({ ...baseFeature, pr: undefined });

    const result = await getMergeReviewData('feat-123');

    expect(result).toEqual({ error: 'No PR data available for this feature' });
  });

  it('returns full data when PR and diff summary are available', async () => {
    mockFindById.mockResolvedValue(baseFeature);
    mockGetPrDiffSummary.mockResolvedValue(baseDiffSummary);

    const result = await getMergeReviewData('feat-123');

    expect(result).toEqual({
      pr: {
        url: 'https://github.com/org/repo/pull/42',
        number: 42,
        status: PrStatus.Open,
        commitHash: 'abc1234def',
        ciStatus: CiStatus.Success,
      },
      diffSummary: baseDiffSummary,
    });
    expect(mockGetPrDiffSummary).toHaveBeenCalledWith('/tmp/worktree', 'main');
  });

  it('returns data with warning when diff summary fails', async () => {
    mockFindById.mockResolvedValue(baseFeature);
    mockGetPrDiffSummary.mockRejectedValue(new Error('git not available'));

    const result = await getMergeReviewData('feat-123');

    expect(result).toEqual({
      pr: {
        url: 'https://github.com/org/repo/pull/42',
        number: 42,
        status: PrStatus.Open,
        commitHash: 'abc1234def',
        ciStatus: CiStatus.Success,
      },
      warning: 'Diff statistics unavailable',
    });
  });

  it('returns data with warning when worktreePath is undefined', async () => {
    mockFindById.mockResolvedValue({ ...baseFeature, worktreePath: undefined });

    const result = await getMergeReviewData('feat-123');

    expect(result).toEqual({
      pr: {
        url: 'https://github.com/org/repo/pull/42',
        number: 42,
        status: PrStatus.Open,
        commitHash: 'abc1234def',
        ciStatus: CiStatus.Success,
      },
      warning: 'Diff statistics unavailable',
    });
    expect(mockGetPrDiffSummary).not.toHaveBeenCalled();
  });

  it('returns PR data without optional fields when they are absent', async () => {
    const minimalPr = {
      url: 'https://github.com/org/repo/pull/1',
      number: 1,
      status: PrStatus.Open,
    };
    mockFindById.mockResolvedValue({
      ...baseFeature,
      pr: minimalPr,
      worktreePath: undefined,
    });

    const result = await getMergeReviewData('feat-123');

    expect('pr' in result && result.pr.commitHash).toBeUndefined();
    expect('pr' in result && result.pr.ciStatus).toBeUndefined();
  });

  it('returns error when repository throws', async () => {
    mockFindById.mockRejectedValue(new Error('Database error'));

    const result = await getMergeReviewData('feat-123');

    expect(result).toEqual({ error: 'Database error' });
  });

  it('returns generic error when repository throws non-Error', async () => {
    mockFindById.mockRejectedValue('something unexpected');

    const result = await getMergeReviewData('feat-123');

    expect(result).toEqual({ error: 'Failed to load merge review data' });
  });
});
