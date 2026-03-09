import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFindById = vi.fn();

vi.mock('@/lib/server-container', () => ({
  resolve: vi.fn(() => ({
    findById: mockFindById,
  })),
}));

const { getFeaturePlan } = await import('@/app/actions/get-feature-plan');

describe('getFeaturePlan', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns error when featureId is empty', async () => {
    const result = await getFeaturePlan('');
    expect(result).toEqual({ error: 'Feature id is required' });
    expect(mockFindById).not.toHaveBeenCalled();
  });

  it('returns error when featureId is whitespace', async () => {
    const result = await getFeaturePlan('   ');
    expect(result).toEqual({ error: 'Feature id is required' });
    expect(mockFindById).not.toHaveBeenCalled();
  });

  it('calls findById with correct featureId', async () => {
    mockFindById.mockResolvedValue({ plan: undefined });
    await getFeaturePlan('feat-1');
    expect(mockFindById).toHaveBeenCalledWith('feat-1');
  });

  it('returns plan data when plan exists', async () => {
    mockFindById.mockResolvedValue({
      plan: {
        state: 'Approved',
        overview: 'Build a login system',
        tasks: [
          {
            title: 'Create login form',
            description: 'Build the UI for login',
            state: 'Done',
          },
          {
            title: 'Add auth middleware',
            description: 'Protect routes with JWT',
            state: 'Work in Progress',
          },
        ],
        requirements: [{ title: 'Secure login', description: 'Must use HTTPS' }],
      },
    });

    const result = await getFeaturePlan('feat-1');

    expect(result).toEqual({
      plan: {
        state: 'Approved',
        overview: 'Build a login system',
        tasks: [
          {
            title: 'Create login form',
            description: 'Build the UI for login',
            state: 'Done',
            actionItems: [],
          },
          {
            title: 'Add auth middleware',
            description: 'Protect routes with JWT',
            state: 'Work in Progress',
            actionItems: [],
          },
        ],
      },
    });
  });

  it('returns plan as undefined when feature has no plan', async () => {
    mockFindById.mockResolvedValue({ plan: undefined });
    const result = await getFeaturePlan('feat-1');
    expect(result).toEqual({ plan: undefined });
  });

  it('returns error when feature is not found', async () => {
    mockFindById.mockResolvedValue(null);
    const result = await getFeaturePlan('feat-999');
    expect(result).toEqual({ error: 'Feature not found' });
  });

  it('returns error on repository failure', async () => {
    mockFindById.mockRejectedValue(new Error('DB connection failed'));
    const result = await getFeaturePlan('feat-1');
    expect(result).toEqual({ error: 'DB connection failed' });
  });

  it('returns generic error for non-Error throws', async () => {
    mockFindById.mockRejectedValue('unknown failure');
    const result = await getFeaturePlan('feat-1');
    expect(result).toEqual({ error: 'Failed to load feature plan' });
  });
});
