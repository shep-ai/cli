import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFindFeatureById = vi.fn();
const mockFindRunById = vi.fn();
const mockApproveExecute = vi.fn();
const mockResumeExecute = vi.fn();

vi.mock('@/lib/server-container', () => ({
  resolve: (token: string) => {
    if (token === 'IFeatureRepository') return { findById: mockFindFeatureById };
    if (token === 'IAgentRunRepository') return { findById: mockFindRunById };
    if (token === 'ApproveAgentRunUseCase') return { execute: mockApproveExecute };
    if (token === 'ResumeFeatureUseCase') return { execute: mockResumeExecute };
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

  it('calls approve use case when run is in waitingApproval status', async () => {
    mockFindFeatureById.mockResolvedValue({ id: 'feat-1', agentRunId: 'run-1' });
    mockFindRunById.mockResolvedValue({ id: 'run-1', status: 'waitingApproval' });
    mockApproveExecute.mockResolvedValue({ approved: true, reason: 'Approved and resumed' });

    const result = await approveFeature('feat-1');

    expect(result).toEqual({ approved: true });
    expect(mockApproveExecute).toHaveBeenCalledWith('run-1', undefined);
    expect(mockResumeExecute).not.toHaveBeenCalled();
  });

  it('calls resume use case with promptPrefix when run is in failed status', async () => {
    mockFindFeatureById.mockResolvedValue({ id: 'feat-1', agentRunId: 'run-1' });
    mockFindRunById.mockResolvedValue({ id: 'run-1', status: 'failed' });
    mockResumeExecute.mockResolvedValue({ feature: {}, newRun: {} });

    const result = await approveFeature('feat-1');

    expect(result).toEqual({ approved: true });
    expect(mockResumeExecute).toHaveBeenCalledWith('feat-1', {
      promptPrefix: 'User approved. Please continue.',
    });
    expect(mockApproveExecute).not.toHaveBeenCalled();
  });

  it('calls resume use case with promptPrefix when run is in interrupted status', async () => {
    mockFindFeatureById.mockResolvedValue({ id: 'feat-1', agentRunId: 'run-1' });
    mockFindRunById.mockResolvedValue({ id: 'run-1', status: 'interrupted' });
    mockResumeExecute.mockResolvedValue({ feature: {}, newRun: {} });

    const result = await approveFeature('feat-1');

    expect(result).toEqual({ approved: true });
    expect(mockResumeExecute).toHaveBeenCalledWith('feat-1', {
      promptPrefix: 'User approved. Please continue.',
    });
    expect(mockApproveExecute).not.toHaveBeenCalled();
  });

  it('calls approve use case without payload when none provided', async () => {
    mockFindFeatureById.mockResolvedValue({ id: 'feat-1', agentRunId: 'run-1' });
    mockFindRunById.mockResolvedValue({ id: 'run-1', status: 'waitingApproval' });
    mockApproveExecute.mockResolvedValue({ approved: true, reason: 'Approved and resumed' });

    const result = await approveFeature('feat-1');

    expect(result).toEqual({ approved: true });
    expect(mockApproveExecute).toHaveBeenCalledWith('run-1', undefined);
  });

  it('forwards payload to approve use case when provided', async () => {
    mockFindFeatureById.mockResolvedValue({ id: 'feat-1', agentRunId: 'run-1' });
    mockFindRunById.mockResolvedValue({ id: 'run-1', status: 'waitingApproval' });
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
    mockFindRunById.mockResolvedValue({ id: 'run-1', status: 'waitingApproval' });
    mockApproveExecute.mockResolvedValue({ approved: false, reason: 'Not waiting for approval' });

    const result = await approveFeature('feat-1');

    expect(result).toEqual({ approved: false, error: 'Not waiting for approval' });
  });

  it('returns error when use case throws', async () => {
    mockFindFeatureById.mockResolvedValue({ id: 'feat-1', agentRunId: 'run-1' });
    mockFindRunById.mockResolvedValue({ id: 'run-1', status: 'waitingApproval' });
    mockApproveExecute.mockRejectedValue(new Error('Database error'));

    const result = await approveFeature('feat-1');

    expect(result).toEqual({ approved: false, error: 'Database error' });
  });
});
