import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFindById = vi.fn();

vi.mock('@/lib/server-container', () => ({
  resolve: vi.fn(() => ({
    findById: mockFindById,
  })),
}));

const { getFeatureMessages } = await import('@/app/actions/get-feature-messages');

describe('getFeatureMessages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns error when featureId is empty', async () => {
    const result = await getFeatureMessages('');
    expect(result).toEqual({ error: 'Feature id is required' });
    expect(mockFindById).not.toHaveBeenCalled();
  });

  it('returns error when featureId is whitespace', async () => {
    const result = await getFeatureMessages('   ');
    expect(result).toEqual({ error: 'Feature id is required' });
    expect(mockFindById).not.toHaveBeenCalled();
  });

  it('calls findById with correct featureId', async () => {
    mockFindById.mockResolvedValue({ messages: [] });
    await getFeatureMessages('feat-1');
    expect(mockFindById).toHaveBeenCalledWith('feat-1');
  });

  it('returns messages from feature', async () => {
    mockFindById.mockResolvedValue({
      messages: [
        {
          id: 'msg-1',
          role: 'assistant',
          content: 'Hello, how can I help?',
          options: ['Option A', 'Option B'],
          selectedOption: 0,
          answer: 'Option A',
        },
        {
          id: 'msg-2',
          role: 'user',
          content: 'I need a login feature',
          options: undefined,
          selectedOption: undefined,
          answer: undefined,
        },
      ],
    });

    const result = await getFeatureMessages('feat-1');

    expect(result).toEqual({
      messages: [
        {
          role: 'assistant',
          content: 'Hello, how can I help?',
          options: ['Option A', 'Option B'],
          selectedOption: 0,
          answer: 'Option A',
        },
        {
          role: 'user',
          content: 'I need a login feature',
          options: undefined,
          selectedOption: undefined,
          answer: undefined,
        },
      ],
    });
  });

  it('returns empty messages array when feature has no messages', async () => {
    mockFindById.mockResolvedValue({ messages: [] });
    const result = await getFeatureMessages('feat-1');
    expect(result).toEqual({ messages: [] });
  });

  it('returns error when feature is not found', async () => {
    mockFindById.mockResolvedValue(null);
    const result = await getFeatureMessages('feat-999');
    expect(result).toEqual({ error: 'Feature not found' });
  });

  it('returns error on repository failure', async () => {
    mockFindById.mockRejectedValue(new Error('DB connection failed'));
    const result = await getFeatureMessages('feat-1');
    expect(result).toEqual({ error: 'DB connection failed' });
  });

  it('returns generic error for non-Error throws', async () => {
    mockFindById.mockRejectedValue('unknown failure');
    const result = await getFeatureMessages('feat-1');
    expect(result).toEqual({ error: 'Failed to load feature messages' });
  });
});
