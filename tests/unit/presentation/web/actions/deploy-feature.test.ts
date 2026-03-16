// @vitest-environment node

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { DevEnvironmentAnalysis } from '@shepai/core/domain/generated/output';

const mockStart = vi.fn();
const mockStartWithAnalysis = vi.fn();
const mockResolve = vi.fn();
vi.mock('@/lib/server-container', () => ({
  resolve: (token: string) => mockResolve(token),
}));

const mockComputeWorktreePath = vi.fn();
vi.mock('@shepai/core/infrastructure/services/ide-launchers/compute-worktree-path', () => ({
  computeWorktreePath: (...args: unknown[]) => mockComputeWorktreePath(...args),
}));

const mockExistsSync = vi.fn<(path: string) => boolean>();
vi.mock('node:fs', () => ({
  existsSync: (path: string) => mockExistsSync(path),
}));

const { deployFeature } = await import(
  '../../../../../src/presentation/web/app/actions/deploy-feature.js'
);

const MOCK_FEATURE = {
  id: 'feat-123',
  repositoryPath: '/home/user/project',
  branch: 'feat/my-feature',
};

const MOCK_WORKTREE_PATH = '/mock/.shep/repos/abc123/wt/feat-my-feature';
const MOCK_CACHE_KEY = 'https://github.com/org/repo.git';

const mockCacheKeyResolve = vi.fn();
const mockFindByCacheKey = vi.fn();

function makeMockAnalysis(overrides?: Partial<DevEnvironmentAnalysis>): DevEnvironmentAnalysis {
  return {
    id: 'analysis-123',
    cacheKey: MOCK_CACHE_KEY,
    canStart: true,
    commands: [{ command: 'npm run dev', description: 'Start dev server' }],
    language: 'TypeScript',
    source: 'Agent' as DevEnvironmentAnalysis['source'],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('deployFeature server action', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockComputeWorktreePath.mockReturnValue(MOCK_WORKTREE_PATH);
    mockExistsSync.mockReturnValue(true);
    mockCacheKeyResolve.mockResolvedValue(MOCK_CACHE_KEY);
    mockFindByCacheKey.mockResolvedValue(null);
    mockResolve.mockImplementation((token: string) => {
      if (token === 'IFeatureRepository') {
        return { findById: vi.fn().mockResolvedValue(MOCK_FEATURE) };
      }
      if (token === 'IDeploymentService') {
        return { start: mockStart, startWithAnalysis: mockStartWithAnalysis };
      }
      if (token === 'IRepoCacheKeyResolver') {
        return { resolve: mockCacheKeyResolve };
      }
      if (token === 'IDevEnvAnalysisRepository') {
        return { findByCacheKey: mockFindByCacheKey };
      }
      return {};
    });
  });

  it('resolves feature, computes worktree path, and calls service.start when no cache', async () => {
    const result = await deployFeature('feat-123');

    expect(mockResolve).toHaveBeenCalledWith('IFeatureRepository');
    expect(mockResolve).toHaveBeenCalledWith('IDeploymentService');
    expect(mockComputeWorktreePath).toHaveBeenCalledWith('/home/user/project', 'feat/my-feature');
    expect(mockExistsSync).toHaveBeenCalledWith(MOCK_WORKTREE_PATH);
    expect(mockStart).toHaveBeenCalledWith('feat-123', MOCK_WORKTREE_PATH);
    expect(result).toEqual({ success: true, state: 'Booting' });
  });

  it('uses startWithAnalysis when cached analysis exists', async () => {
    const cached = makeMockAnalysis();
    mockFindByCacheKey.mockResolvedValue(cached);

    const result = await deployFeature('feat-123');

    expect(mockStartWithAnalysis).toHaveBeenCalledWith('feat-123', MOCK_WORKTREE_PATH, cached);
    expect(mockStart).not.toHaveBeenCalled();
    expect(result).toEqual({ success: true, state: 'Booting' });
  });

  it('returns NotStartable when cached analysis has canStart false', async () => {
    const cached = makeMockAnalysis({ canStart: false, reason: 'Pure utility library' });
    mockFindByCacheKey.mockResolvedValue(cached);

    const result = await deployFeature('feat-123');

    expect(mockStartWithAnalysis).not.toHaveBeenCalled();
    expect(mockStart).not.toHaveBeenCalled();
    expect(result).toEqual({ success: true, state: 'NotStartable' });
  });

  it('falls back to direct start when cache lookup fails', async () => {
    mockCacheKeyResolve.mockRejectedValue(new Error('git not found'));

    const result = await deployFeature('feat-123');

    expect(mockStart).toHaveBeenCalledWith('feat-123', MOCK_WORKTREE_PATH);
    expect(result).toEqual({ success: true, state: 'Booting' });
  });

  it('returns error when featureId is empty', async () => {
    const result = await deployFeature('');

    expect(result).toEqual({ success: false, error: 'featureId is required' });
    expect(mockStart).not.toHaveBeenCalled();
  });

  it('returns error when feature is not found', async () => {
    mockResolve.mockImplementation((token: string) => {
      if (token === 'IFeatureRepository') {
        return { findById: vi.fn().mockResolvedValue(null) };
      }
      if (token === 'IDeploymentService') {
        return { start: mockStart, startWithAnalysis: mockStartWithAnalysis };
      }
      if (token === 'IRepoCacheKeyResolver') {
        return { resolve: mockCacheKeyResolve };
      }
      if (token === 'IDevEnvAnalysisRepository') {
        return { findByCacheKey: mockFindByCacheKey };
      }
      return {};
    });

    const result = await deployFeature('nonexistent-id');

    expect(result).toEqual({ success: false, error: 'Feature not found: nonexistent-id' });
    expect(mockStart).not.toHaveBeenCalled();
  });

  it('returns error when worktree directory does not exist', async () => {
    mockExistsSync.mockReturnValue(false);

    const result = await deployFeature('feat-123');

    expect(result.success).toBe(false);
    expect(result.error).toContain('does not exist');
    expect(result.error).toContain(MOCK_WORKTREE_PATH);
    expect(mockStart).not.toHaveBeenCalled();
  });

  it('returns error when service.start throws', async () => {
    mockStart.mockImplementation(() => {
      throw new Error('No dev script found in package.json');
    });

    const result = await deployFeature('feat-123');

    expect(result).toEqual({
      success: false,
      error: 'No dev script found in package.json',
    });
  });

  it('returns generic error for non-Error throws', async () => {
    mockStart.mockImplementation(() => {
      throw 'unexpected';
    });

    const result = await deployFeature('feat-123');

    expect(result).toEqual({ success: false, error: 'Failed to deploy feature' });
  });
});
