import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFindById = vi.fn();
const mockPlanExecute = vi.fn();
const mockGetPrDiffSummary = vi.fn();

vi.mock('@/lib/server-container', () => ({
  resolve: (token: string) => {
    if (token === 'IFeatureRepository') return { findById: mockFindById };
    if (token === 'GetPlanArtifactUseCase') return { execute: mockPlanExecute };
    if (token === 'IGitPrService') return { getPrDiffSummary: mockGetPrDiffSummary };
    throw new Error(`Unknown token: ${token}`);
  },
}));

const { getMergeReviewData } = await import(
  '../../../../../src/presentation/web/app/actions/get-merge-review-data.js'
);

describe('getMergeReviewData server action', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns error when featureId is empty', async () => {
    const result = await getMergeReviewData('');

    expect(result).toEqual({ error: 'Feature id is required' });
    expect(mockFindById).not.toHaveBeenCalled();
  });

  it('returns error when featureId is whitespace only', async () => {
    const result = await getMergeReviewData('   ');

    expect(result).toEqual({ error: 'Feature id is required' });
    expect(mockFindById).not.toHaveBeenCalled();
  });

  it('returns error when feature is not found', async () => {
    mockFindById.mockResolvedValue(null);

    const result = await getMergeReviewData('feat-1');

    expect(result).toEqual({ error: 'Feature not found' });
  });

  it('returns full MergeReviewData when feature has PR, worktree, and diff succeeds', async () => {
    mockFindById.mockResolvedValue({
      id: 'feat-1',
      branch: 'feat/my-feature',
      worktreePath: '/tmp/wt/feat-1',
      pr: {
        url: 'https://github.com/org/repo/pull/42',
        number: 42,
        status: 'Open',
        commitHash: 'abc1234',
        ciStatus: 'Success',
      },
    });
    mockPlanExecute.mockResolvedValue({
      phases: [
        { id: 'phase-1', name: 'Foundation', description: 'Set up types' },
        { id: 'phase-2', name: 'Implementation' },
      ],
    });
    mockGetPrDiffSummary.mockResolvedValue({
      filesChanged: 10,
      additions: 200,
      deletions: 50,
      commitCount: 3,
    });

    const result = await getMergeReviewData('feat-1');

    expect(result).toEqual({
      pr: {
        url: 'https://github.com/org/repo/pull/42',
        number: 42,
        status: 'Open',
        commitHash: 'abc1234',
        ciStatus: 'Success',
      },
      branch: { source: 'feat/my-feature', target: 'main' },
      phases: [
        { id: 'phase-1', name: 'Foundation', description: 'Set up types' },
        { id: 'phase-2', name: 'Implementation', description: undefined },
      ],
      diffSummary: {
        filesChanged: 10,
        additions: 200,
        deletions: 50,
        commitCount: 3,
      },
    });
    expect(mockGetPrDiffSummary).toHaveBeenCalledWith('/tmp/wt/feat-1', 'main');
  });

  it('returns data with warning when diff summary fails', async () => {
    mockFindById.mockResolvedValue({
      id: 'feat-1',
      branch: 'feat/x',
      worktreePath: '/tmp/wt/feat-1',
      pr: {
        url: 'https://github.com/org/repo/pull/10',
        number: 10,
        status: 'Open',
      },
    });
    mockPlanExecute.mockRejectedValue(new Error('No plan'));
    mockGetPrDiffSummary.mockRejectedValue(new Error('git error'));

    const result = await getMergeReviewData('feat-1');

    expect(result).toEqual({
      pr: {
        url: 'https://github.com/org/repo/pull/10',
        number: 10,
        status: 'Open',
        commitHash: undefined,
        ciStatus: undefined,
      },
      branch: { source: 'feat/x', target: 'main' },
      phases: undefined,
      warning: 'Diff statistics unavailable',
    });
  });

  it('returns data without diff when worktreePath is undefined', async () => {
    mockFindById.mockResolvedValue({
      id: 'feat-1',
      branch: 'feat/x',
      worktreePath: undefined,
      pr: {
        url: 'https://github.com/org/repo/pull/5',
        number: 5,
        status: 'Merged',
      },
    });
    mockPlanExecute.mockRejectedValue(new Error('No plan'));

    const result = await getMergeReviewData('feat-1');

    expect(result).toEqual({
      pr: {
        url: 'https://github.com/org/repo/pull/5',
        number: 5,
        status: 'Merged',
        commitHash: undefined,
        ciStatus: undefined,
      },
      branch: { source: 'feat/x', target: 'main' },
      phases: undefined,
    });
    expect(mockGetPrDiffSummary).not.toHaveBeenCalled();
  });

  it('returns warning when neither PR nor worktreePath exist', async () => {
    mockFindById.mockResolvedValue({
      id: 'feat-1',
      branch: 'feat/x',
      worktreePath: undefined,
      pr: undefined,
    });
    mockPlanExecute.mockRejectedValue(new Error('No plan'));

    const result = await getMergeReviewData('feat-1');

    expect(result).toEqual({
      pr: undefined,
      branch: { source: 'feat/x', target: 'main' },
      phases: undefined,
      warning: 'No PR or diff data available',
    });
    expect(mockGetPrDiffSummary).not.toHaveBeenCalled();
  });

  it('returns data with phases undefined when plan loading fails', async () => {
    mockFindById.mockResolvedValue({
      id: 'feat-1',
      branch: 'feat/x',
      worktreePath: '/tmp/wt/feat-1',
      pr: {
        url: 'https://github.com/org/repo/pull/3',
        number: 3,
        status: 'Open',
        ciStatus: 'Pending',
      },
    });
    mockPlanExecute.mockRejectedValue(new Error('Plan file not found'));
    mockGetPrDiffSummary.mockResolvedValue({
      filesChanged: 2,
      additions: 10,
      deletions: 5,
      commitCount: 1,
    });

    const result = await getMergeReviewData('feat-1');

    expect(result).toEqual({
      pr: {
        url: 'https://github.com/org/repo/pull/3',
        number: 3,
        status: 'Open',
        commitHash: undefined,
        ciStatus: 'Pending',
      },
      branch: { source: 'feat/x', target: 'main' },
      phases: undefined,
      diffSummary: {
        filesChanged: 2,
        additions: 10,
        deletions: 5,
        commitCount: 1,
      },
    });
  });

  it('returns error when an unexpected exception is thrown', async () => {
    mockFindById.mockRejectedValue(new Error('Database connection failed'));

    const result = await getMergeReviewData('feat-1');

    expect(result).toEqual({ error: 'Database connection failed' });
  });

  it('returns generic error message for non-Error throws', async () => {
    mockFindById.mockRejectedValue('some string error');

    const result = await getMergeReviewData('feat-1');

    expect(result).toEqual({ error: 'Failed to load merge review data' });
  });
});
