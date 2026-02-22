import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockExecute = vi.fn();
vi.mock('@/lib/server-container', () => ({
  resolve: () => ({ execute: mockExecute }),
}));

const { deleteFeature } = await import(
  '../../../../../../src/presentation/web/app/actions/delete-feature.js'
);

describe('deleteFeature server action', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns deleted feature on success', async () => {
    const feature = { id: 'abc-123', name: 'My Feature', slug: 'my-feature' };
    mockExecute.mockResolvedValue(feature);

    const result = await deleteFeature('abc-123');

    expect(result).toEqual({ feature });
    expect(mockExecute).toHaveBeenCalledWith('abc-123');
  });

  it('returns error when id is empty string', async () => {
    const result = await deleteFeature('');

    expect(result).toEqual({ error: 'id is required' });
    expect(mockExecute).not.toHaveBeenCalled();
  });

  it('returns error when id is whitespace-only', async () => {
    const result = await deleteFeature('   ');

    expect(result).toEqual({ error: 'id is required' });
    expect(mockExecute).not.toHaveBeenCalled();
  });

  it('returns error when use case throws Error', async () => {
    mockExecute.mockRejectedValue(new Error('Feature not found'));

    const result = await deleteFeature('bad-id');

    expect(result).toEqual({ error: 'Feature not found' });
  });

  it('returns generic error when use case throws non-Error', async () => {
    mockExecute.mockRejectedValue('something unexpected');

    const result = await deleteFeature('bad-id');

    expect(result).toEqual({ error: 'Failed to delete feature' });
  });
});
