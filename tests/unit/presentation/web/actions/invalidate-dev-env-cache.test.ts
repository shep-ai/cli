// @vitest-environment node

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockResolve = vi.fn();
vi.mock('@/lib/server-container', () => ({
  resolve: (token: string) => mockResolve(token),
}));

const mockIsAbsolute = vi.fn<(p: string) => boolean>();
vi.mock('node:path', async () => {
  const actual = await vi.importActual('node:path');
  return { ...actual, isAbsolute: (p: string) => mockIsAbsolute(p) };
});

const { invalidateDevEnvCache } = await import(
  '../../../../../src/presentation/web/app/actions/invalidate-dev-env-cache.js'
);

const MOCK_CACHE_KEY = 'https://github.com/org/repo.git';
const MOCK_REPO_PATH = '/home/user/project';

const mockCacheKeyResolve = vi.fn();
const mockDeleteByCacheKey = vi.fn();

describe('invalidateDevEnvCache server action', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAbsolute.mockImplementation((p: string) => /^\//.test(p));
    mockCacheKeyResolve.mockResolvedValue(MOCK_CACHE_KEY);
    mockDeleteByCacheKey.mockResolvedValue(undefined);

    mockResolve.mockImplementation((token: string) => {
      if (token === 'IRepoCacheKeyResolver') {
        return { resolve: mockCacheKeyResolve };
      }
      if (token === 'IDevEnvAnalysisRepository') {
        return { deleteByCacheKey: mockDeleteByCacheKey };
      }
      return {};
    });
  });

  it('resolves cache key and deletes cached entry', async () => {
    const result = await invalidateDevEnvCache(MOCK_REPO_PATH);

    expect(mockCacheKeyResolve).toHaveBeenCalledWith(MOCK_REPO_PATH);
    expect(mockDeleteByCacheKey).toHaveBeenCalledWith(MOCK_CACHE_KEY);
    expect(result).toEqual({ success: true });
  });

  it('succeeds even when no cache entry exists (no-op delete)', async () => {
    // deleteByCacheKey doesn't throw when key doesn't exist
    const result = await invalidateDevEnvCache(MOCK_REPO_PATH);

    expect(result).toEqual({ success: true });
  });

  it('returns error for empty repositoryPath', async () => {
    const result = await invalidateDevEnvCache('');

    expect(result).toEqual({ success: false, error: 'repositoryPath must be an absolute path' });
    expect(mockCacheKeyResolve).not.toHaveBeenCalled();
  });

  it('returns error for relative repositoryPath', async () => {
    const result = await invalidateDevEnvCache('relative/path');

    expect(result).toEqual({ success: false, error: 'repositoryPath must be an absolute path' });
  });

  it('returns error when cache key resolution fails', async () => {
    mockCacheKeyResolve.mockRejectedValue(new Error('git command failed'));

    const result = await invalidateDevEnvCache(MOCK_REPO_PATH);

    expect(result).toEqual({ success: false, error: 'git command failed' });
  });

  it('returns error when delete fails', async () => {
    mockDeleteByCacheKey.mockRejectedValue(new Error('database error'));

    const result = await invalidateDevEnvCache(MOCK_REPO_PATH);

    expect(result).toEqual({ success: false, error: 'database error' });
  });
});
