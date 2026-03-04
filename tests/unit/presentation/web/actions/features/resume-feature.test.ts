import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockExecute = vi.fn();
vi.mock('@/lib/server-container', () => ({
  resolve: () => ({ execute: mockExecute }),
}));

const { resumeFeature } = await import(
  '../../../../../../src/presentation/web/app/actions/resume-feature.js'
);

describe('resumeFeature server action', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns { resumed: true } on success', async () => {
    mockExecute.mockResolvedValue(undefined);

    const result = await resumeFeature('abc-123');

    expect(result).toEqual({ resumed: true });
    expect(mockExecute).toHaveBeenCalledWith('abc-123');
  });

  it('returns error when id is empty string', async () => {
    const result = await resumeFeature('');

    expect(result).toEqual({ resumed: false, error: 'id is required' });
    expect(mockExecute).not.toHaveBeenCalled();
  });

  it('returns error when id is whitespace-only', async () => {
    const result = await resumeFeature('   ');

    expect(result).toEqual({ resumed: false, error: 'id is required' });
    expect(mockExecute).not.toHaveBeenCalled();
  });

  it('returns error when use case throws Error', async () => {
    mockExecute.mockRejectedValue(new Error('Feature not found'));

    const result = await resumeFeature('bad-id');

    expect(result).toEqual({ resumed: false, error: 'Feature not found' });
  });

  it('returns generic error when use case throws non-Error', async () => {
    mockExecute.mockRejectedValue('something unexpected');

    const result = await resumeFeature('bad-id');

    expect(result).toEqual({ resumed: false, error: 'Failed to resume feature' });
  });
});
