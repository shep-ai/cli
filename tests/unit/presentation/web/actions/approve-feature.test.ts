import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFindById = vi.fn();
const mockExecute = vi.fn();

vi.mock('@/lib/server-container', () => ({
  resolve: (token: string) => {
    if (token === 'IFeatureRepository') return { findById: mockFindById };
    if (token === 'ApproveAgentRunUseCase') return { execute: mockExecute };
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
    expect(mockFindById).not.toHaveBeenCalled();
  });

  it('returns error when feature is not found', async () => {
    mockFindById.mockResolvedValue(null);

    const result = await approveFeature('feat-1');

    expect(result).toEqual({ approved: false, error: 'Feature not found' });
  });

  it('returns error when feature has no agentRunId', async () => {
    mockFindById.mockResolvedValue({ id: 'feat-1', agentRunId: null });

    const result = await approveFeature('feat-1');

    expect(result).toEqual({ approved: false, error: 'Feature has no agent run' });
  });

  it('calls use case without payload when none provided', async () => {
    mockFindById.mockResolvedValue({ id: 'feat-1', agentRunId: 'run-1' });
    mockExecute.mockResolvedValue({ approved: true, reason: 'Approved and resumed' });

    const result = await approveFeature('feat-1');

    expect(result).toEqual({ approved: true });
    expect(mockExecute).toHaveBeenCalledWith('run-1', undefined);
  });

  it('forwards payload to use case when provided', async () => {
    mockFindById.mockResolvedValue({ id: 'feat-1', agentRunId: 'run-1' });
    mockExecute.mockResolvedValue({ approved: true, reason: 'Approved and resumed' });

    const payload = {
      approved: true,
      changedSelections: [{ questionId: 'q1', selectedOption: 'option-a' }],
    };
    const result = await approveFeature('feat-1', payload);

    expect(result).toEqual({ approved: true });
    expect(mockExecute).toHaveBeenCalledWith('run-1', payload);
  });

  it('returns error when use case rejects', async () => {
    mockFindById.mockResolvedValue({ id: 'feat-1', agentRunId: 'run-1' });
    mockExecute.mockResolvedValue({ approved: false, reason: 'Not waiting for approval' });

    const result = await approveFeature('feat-1');

    expect(result).toEqual({ approved: false, error: 'Not waiting for approval' });
  });

  it('returns error when use case throws', async () => {
    mockFindById.mockResolvedValue({ id: 'feat-1', agentRunId: 'run-1' });
    mockExecute.mockRejectedValue(new Error('Database error'));

    const result = await approveFeature('feat-1');

    expect(result).toEqual({ approved: false, error: 'Database error' });
  });
});
