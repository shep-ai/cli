import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFindFeatureById = vi.fn();
const mockApproveExecute = vi.fn();

vi.mock('@/lib/server-container', () => ({
  resolve: (token: string) => {
    if (token === 'IFeatureRepository') return { findById: mockFindFeatureById };
    if (token === 'ApproveAgentRunUseCase') return { execute: mockApproveExecute };
    throw new Error(`Unknown token: ${token}`);
  },
}));

const { approveFeature } = await import(
  '../../../../../src/presentation/web/app/actions/approve-feature.js'
);

describe('approveFeature server action', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns error when featureId is empty', async () => {
    const result = await approveFeature('');

    expect(result).toEqual({ approved: false, error: 'Feature id is required' });
    expect(mockFindFeatureById).not.toHaveBeenCalled();
  });

  it('returns error when feature is not found', async () => {
    mockFindFeatureById.mockResolvedValue(null);

    const result = await approveFeature('feat-1');

    expect(result).toEqual({ approved: false, error: 'Feature not found' });
  });

  it('returns error when feature has no agentRunId', async () => {
    mockFindFeatureById.mockResolvedValue({ id: 'feat-1', agentRunId: null });

    const result = await approveFeature('feat-1');

    expect(result).toEqual({ approved: false, error: 'Feature has no agent run' });
  });

  it('calls approve use case with agentRunId directly', async () => {
    mockFindFeatureById.mockResolvedValue({ id: 'feat-1', agentRunId: 'run-1' });
    mockApproveExecute.mockResolvedValue({ approved: true, reason: 'Approved and resumed' });

    const result = await approveFeature('feat-1');

    expect(result).toEqual({ approved: true });
    expect(mockApproveExecute).toHaveBeenCalledWith('run-1', undefined);
  });

  it('forwards payload to approve use case when provided', async () => {
    mockFindFeatureById.mockResolvedValue({ id: 'feat-1', agentRunId: 'run-1' });
    mockApproveExecute.mockResolvedValue({ approved: true, reason: 'Approved and resumed' });

    const payload = {
      approved: true,
      changedSelections: [{ questionId: 'q1', selectedOption: 'option-a' }],
    };
    const result = await approveFeature('feat-1', payload);

    expect(result).toEqual({ approved: true });
    expect(mockApproveExecute).toHaveBeenCalledWith('run-1', payload);
  });

  it('returns error when approve use case rejects', async () => {
    mockFindFeatureById.mockResolvedValue({ id: 'feat-1', agentRunId: 'run-1' });
    mockApproveExecute.mockResolvedValue({ approved: false, reason: 'Not in approvable state' });

    const result = await approveFeature('feat-1');

    expect(result).toEqual({ approved: false, error: 'Not in approvable state' });
  });

  it('returns error when use case throws', async () => {
    mockFindFeatureById.mockResolvedValue({ id: 'feat-1', agentRunId: 'run-1' });
    mockApproveExecute.mockRejectedValue(new Error('Database error'));

    const result = await approveFeature('feat-1');

    expect(result).toEqual({ approved: false, error: 'Database error' });
  });
});
