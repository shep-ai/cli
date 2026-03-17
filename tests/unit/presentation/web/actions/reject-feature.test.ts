import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFindFeatureById = vi.fn();
const mockRejectExecute = vi.fn();

vi.mock('@/lib/server-container', () => ({
  resolve: (token: string) => {
    if (token === 'IFeatureRepository') return { findById: mockFindFeatureById };
    if (token === 'RejectAgentRunUseCase') return { execute: mockRejectExecute };
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
    expect(mockFindFeatureById).not.toHaveBeenCalled();
    expect(mockRejectExecute).not.toHaveBeenCalled();
  });

  it('returns error when featureId is whitespace-only', async () => {
    const result = await rejectFeature('   ', 'some feedback');

    expect(result).toEqual({ rejected: false, error: 'Feature id is required' });
  });

  it('returns error when feedback is empty', async () => {
    const result = await rejectFeature('feat-1', '');

    expect(result).toEqual({ rejected: false, error: 'Feedback is required' });
    expect(mockFindFeatureById).not.toHaveBeenCalled();
  });

  it('returns error when feedback is whitespace-only', async () => {
    const result = await rejectFeature('feat-1', '   ');

    expect(result).toEqual({ rejected: false, error: 'Feedback is required' });
  });

  it('returns error when feature is not found', async () => {
    mockFindFeatureById.mockResolvedValue(null);

    const result = await rejectFeature('feat-1', 'needs changes');

    expect(result).toEqual({ rejected: false, error: 'Feature not found' });
    expect(mockFindFeatureById).toHaveBeenCalledWith('feat-1');
  });

  it('returns error when feature has no agentRunId', async () => {
    mockFindFeatureById.mockResolvedValue({ id: 'feat-1', agentRunId: null });

    const result = await rejectFeature('feat-1', 'needs changes');

    expect(result).toEqual({ rejected: false, error: 'Feature has no agent run' });
  });

  it('calls reject use case with agentRunId directly', async () => {
    mockFindFeatureById.mockResolvedValue({ id: 'feat-1', agentRunId: 'run-1' });
    mockRejectExecute.mockResolvedValue({
      rejected: true,
      reason: 'Rejected and iterating',
      iteration: 2,
      iterationWarning: false,
    });

    const result = await rejectFeature('feat-1', 'needs changes');

    expect(result).toEqual({ rejected: true, iteration: 2, iterationWarning: false });
    expect(mockRejectExecute).toHaveBeenCalledWith('run-1', 'needs changes', undefined);
  });

  it('passes attachments to reject use case', async () => {
    mockFindFeatureById.mockResolvedValue({ id: 'feat-1', agentRunId: 'run-1' });
    mockRejectExecute.mockResolvedValue({
      rejected: true,
      reason: 'Rejected and iterating',
      iteration: 1,
      iterationWarning: false,
    });

    const result = await rejectFeature('feat-1', 'fix this', ['/path/to/screenshot.png']);

    expect(result).toEqual({ rejected: true, iteration: 1, iterationWarning: false });
    expect(mockRejectExecute).toHaveBeenCalledWith('run-1', 'fix this', [
      '/path/to/screenshot.png',
    ]);
  });

  it('returns error when reject use case rejects with reason', async () => {
    mockFindFeatureById.mockResolvedValue({ id: 'feat-1', agentRunId: 'run-1' });
    mockRejectExecute.mockResolvedValue({ rejected: false, reason: 'Not in rejectable state' });

    const result = await rejectFeature('feat-1', 'needs changes');

    expect(result).toEqual({ rejected: false, error: 'Not in rejectable state' });
  });

  it('returns iterationWarning when iteration >= 5', async () => {
    mockFindFeatureById.mockResolvedValue({ id: 'feat-1', agentRunId: 'run-1' });
    mockRejectExecute.mockResolvedValue({
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
    mockFindFeatureById.mockResolvedValue({ id: 'feat-1', agentRunId: 'run-1' });
    mockRejectExecute.mockRejectedValue(new Error('Database connection failed'));

    const result = await rejectFeature('feat-1', 'needs changes');

    expect(result).toEqual({ rejected: false, error: 'Database connection failed' });
  });

  it('returns generic error when use case throws non-Error', async () => {
    mockFindFeatureById.mockResolvedValue({ id: 'feat-1', agentRunId: 'run-1' });
    mockRejectExecute.mockRejectedValue('something unexpected');

    const result = await rejectFeature('feat-1', 'needs changes');

    expect(result).toEqual({ rejected: false, error: 'Failed to reject feature' });
  });
});
