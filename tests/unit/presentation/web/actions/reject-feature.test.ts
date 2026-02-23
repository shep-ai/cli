import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFindById = vi.fn();
const mockExecute = vi.fn();

vi.mock('@/lib/server-container', () => ({
  resolve: (token: string) => {
    if (token === 'IFeatureRepository') return { findById: mockFindById };
    if (token === 'RejectAgentRunUseCase') return { execute: mockExecute };
    throw new Error(`Unknown token: ${token}`);
  },
}));

const { rejectFeature } = await import(
  '../../../../../src/presentation/web/app/actions/reject-feature.js'
);

describe('rejectFeature server action', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns error when featureId is empty', async () => {
    const result = await rejectFeature('', 'some feedback');

    expect(result).toEqual({ rejected: false, error: 'Feature id is required' });
    expect(mockFindById).not.toHaveBeenCalled();
    expect(mockExecute).not.toHaveBeenCalled();
  });

  it('returns error when featureId is whitespace-only', async () => {
    const result = await rejectFeature('   ', 'some feedback');

    expect(result).toEqual({ rejected: false, error: 'Feature id is required' });
  });

  it('returns error when feedback is empty', async () => {
    const result = await rejectFeature('feat-1', '');

    expect(result).toEqual({ rejected: false, error: 'Feedback is required' });
    expect(mockFindById).not.toHaveBeenCalled();
  });

  it('returns error when feedback is whitespace-only', async () => {
    const result = await rejectFeature('feat-1', '   ');

    expect(result).toEqual({ rejected: false, error: 'Feedback is required' });
  });

  it('returns error when feature is not found', async () => {
    mockFindById.mockResolvedValue(null);

    const result = await rejectFeature('feat-1', 'needs changes');

    expect(result).toEqual({ rejected: false, error: 'Feature not found' });
    expect(mockFindById).toHaveBeenCalledWith('feat-1');
  });

  it('returns error when feature has no agentRunId', async () => {
    mockFindById.mockResolvedValue({ id: 'feat-1', agentRunId: null });

    const result = await rejectFeature('feat-1', 'needs changes');

    expect(result).toEqual({ rejected: false, error: 'Feature has no agent run' });
  });

  it('returns error when use case rejects with reason', async () => {
    mockFindById.mockResolvedValue({ id: 'feat-1', agentRunId: 'run-1' });
    mockExecute.mockResolvedValue({ rejected: false, reason: 'Not waiting for approval' });

    const result = await rejectFeature('feat-1', 'needs changes');

    expect(result).toEqual({ rejected: false, error: 'Not waiting for approval' });
    expect(mockExecute).toHaveBeenCalledWith('run-1', 'needs changes');
  });

  it('returns success with iteration info on successful rejection', async () => {
    mockFindById.mockResolvedValue({ id: 'feat-1', agentRunId: 'run-1' });
    mockExecute.mockResolvedValue({
      rejected: true,
      reason: 'Rejected and iterating',
      iteration: 2,
      iterationWarning: false,
    });

    const result = await rejectFeature('feat-1', 'needs changes');

    expect(result).toEqual({
      rejected: true,
      iteration: 2,
      iterationWarning: false,
    });
  });

  it('returns iterationWarning when iteration >= 5', async () => {
    mockFindById.mockResolvedValue({ id: 'feat-1', agentRunId: 'run-1' });
    mockExecute.mockResolvedValue({
      rejected: true,
      reason: 'Rejected and iterating',
      iteration: 5,
      iterationWarning: true,
    });

    const result = await rejectFeature('feat-1', 'needs changes');

    expect(result).toEqual({
      rejected: true,
      iteration: 5,
      iterationWarning: true,
    });
  });

  it('returns error when use case throws Error', async () => {
    mockFindById.mockResolvedValue({ id: 'feat-1', agentRunId: 'run-1' });
    mockExecute.mockRejectedValue(new Error('Database connection failed'));

    const result = await rejectFeature('feat-1', 'needs changes');

    expect(result).toEqual({ rejected: false, error: 'Database connection failed' });
  });

  it('returns generic error when use case throws non-Error', async () => {
    mockFindById.mockResolvedValue({ id: 'feat-1', agentRunId: 'run-1' });
    mockExecute.mockRejectedValue('something unexpected');

    const result = await rejectFeature('feat-1', 'needs changes');

    expect(result).toEqual({ rejected: false, error: 'Failed to reject feature' });
  });
});
