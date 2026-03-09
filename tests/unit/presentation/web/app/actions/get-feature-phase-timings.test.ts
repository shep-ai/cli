import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFindByFeatureId = vi.fn();
const mockFeatureFindById = vi.fn();

vi.mock('@/lib/server-container', () => ({
  resolve: vi.fn((token: string) => {
    if (token === 'IFeatureRepository') return { findById: mockFeatureFindById };
    return { findByFeatureId: mockFindByFeatureId };
  }),
}));

// Must import after vi.mock
const { getFeaturePhaseTimings } = await import('@/app/actions/get-feature-phase-timings');

describe('getFeaturePhaseTimings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns error when featureId is empty', async () => {
    const result = await getFeaturePhaseTimings('');
    expect(result).toEqual({ error: 'Feature id is required' });
    expect(mockFindByFeatureId).not.toHaveBeenCalled();
  });

  it('returns error when featureId is whitespace', async () => {
    const result = await getFeaturePhaseTimings('   ');
    expect(result).toEqual({ error: 'Feature id is required' });
    expect(mockFindByFeatureId).not.toHaveBeenCalled();
  });

  it('calls findByFeatureId with correct featureId', async () => {
    mockFindByFeatureId.mockResolvedValue([]);
    await getFeaturePhaseTimings('feat-1');
    expect(mockFindByFeatureId).toHaveBeenCalledWith('feat-1');
  });

  it('returns timings with bigint fields converted to number', async () => {
    mockFindByFeatureId.mockResolvedValue([
      {
        id: 'pt-1',
        agentRunId: 'run-1',
        phase: 'analyze',
        startedAt: '2025-01-01T00:00:00Z',
        completedAt: '2025-01-01T00:01:00Z',
        durationMs: BigInt(60000),
        waitingApprovalAt: '2025-01-01T00:00:30Z',
        approvalWaitMs: BigInt(5000),
      },
    ]);

    const result = await getFeaturePhaseTimings('feat-1');

    expect(result).toEqual({
      timings: [
        {
          agentRunId: 'run-1',
          phase: 'analyze',
          startedAt: '2025-01-01T00:00:00Z',
          completedAt: '2025-01-01T00:01:00Z',
          durationMs: 60000,
          waitingApprovalAt: '2025-01-01T00:00:30Z',
          approvalWaitMs: 5000,
        },
      ],
      rejectionFeedback: [],
    });
  });

  it('handles undefined optional fields gracefully', async () => {
    mockFindByFeatureId.mockResolvedValue([
      {
        id: 'pt-2',
        agentRunId: 'run-2',
        phase: 'implement',
        startedAt: '2025-01-01T00:00:00Z',
        completedAt: undefined,
        durationMs: undefined,
        waitingApprovalAt: undefined,
        approvalWaitMs: undefined,
      },
    ]);

    const result = await getFeaturePhaseTimings('feat-1');

    expect(result).toEqual({
      timings: [
        {
          agentRunId: 'run-2',
          phase: 'implement',
          startedAt: '2025-01-01T00:00:00Z',
          completedAt: undefined,
          durationMs: undefined,
          waitingApprovalAt: undefined,
          approvalWaitMs: undefined,
        },
      ],
      rejectionFeedback: [],
    });
  });

  it('returns empty timings array when no timings exist', async () => {
    mockFindByFeatureId.mockResolvedValue([]);
    const result = await getFeaturePhaseTimings('feat-1');
    expect(result).toEqual({ timings: [], rejectionFeedback: [] });
  });

  it('returns error on repository failure', async () => {
    mockFindByFeatureId.mockRejectedValue(new Error('DB connection failed'));
    const result = await getFeaturePhaseTimings('feat-1');
    expect(result).toEqual({ error: 'DB connection failed' });
  });

  it('returns generic error for non-Error throws', async () => {
    mockFindByFeatureId.mockRejectedValue('unknown failure');
    const result = await getFeaturePhaseTimings('feat-1');
    expect(result).toEqual({ error: 'Failed to load phase timings' });
  });
});
