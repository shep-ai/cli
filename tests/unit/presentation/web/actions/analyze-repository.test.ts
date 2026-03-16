// @vitest-environment node

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { DevEnvironmentAnalysis } from '@shepai/core/domain/generated/output';

const mockResolve = vi.fn();
vi.mock('@/lib/server-container', () => ({
  resolve: (token: string) => mockResolve(token),
}));

const mockIsAbsolute = vi.fn<(p: string) => boolean>();
vi.mock('node:path', async () => {
  const actual = await vi.importActual('node:path');
  return { ...actual, isAbsolute: (p: string) => mockIsAbsolute(p) };
});

const { analyzeRepository } = await import(
  '../../../../../src/presentation/web/app/actions/analyze-repository.js'
);

const MOCK_CACHE_KEY = 'https://github.com/org/repo.git';
const MOCK_REPO_PATH = '/home/user/project';

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

const mockCacheKeyResolve = vi.fn();
const mockFindByCacheKey = vi.fn();
const mockSave = vi.fn();
const mockAnalyze = vi.fn();
const mockAutoDetectMode = vi.fn();

describe('analyzeRepository server action', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAbsolute.mockImplementation((p: string) => /^\//.test(p));
    mockCacheKeyResolve.mockResolvedValue(MOCK_CACHE_KEY);
    mockFindByCacheKey.mockResolvedValue(null);
    mockSave.mockResolvedValue(undefined);
    mockAutoDetectMode.mockReturnValue('agent');
    mockAnalyze.mockResolvedValue(makeMockAnalysis({ cacheKey: '' }));

    mockResolve.mockImplementation((token: string) => {
      if (token === 'IRepoCacheKeyResolver') {
        return { resolve: mockCacheKeyResolve };
      }
      if (token === 'IDevEnvAnalysisRepository') {
        return { findByCacheKey: mockFindByCacheKey, save: mockSave };
      }
      if (token === 'IDevEnvironmentAnalyzer') {
        return { analyze: mockAnalyze, autoDetectMode: mockAutoDetectMode };
      }
      return {};
    });
  });

  it('returns cached result without re-analyzing', async () => {
    const cached = makeMockAnalysis();
    mockFindByCacheKey.mockResolvedValue(cached);

    const result = await analyzeRepository(MOCK_REPO_PATH);

    expect(result).toEqual({ success: true, analysis: cached });
    expect(mockAnalyze).not.toHaveBeenCalled();
    expect(mockSave).not.toHaveBeenCalled();
  });

  it('runs analysis and saves to cache on cache miss', async () => {
    const freshAnalysis = makeMockAnalysis({ cacheKey: '' });
    mockAnalyze.mockResolvedValue(freshAnalysis);

    const result = await analyzeRepository(MOCK_REPO_PATH);

    expect(mockCacheKeyResolve).toHaveBeenCalledWith(MOCK_REPO_PATH);
    expect(mockFindByCacheKey).toHaveBeenCalledWith(MOCK_CACHE_KEY);
    expect(mockAutoDetectMode).toHaveBeenCalledWith(MOCK_REPO_PATH);
    expect(mockAnalyze).toHaveBeenCalledWith(MOCK_REPO_PATH, 'agent');
    expect(mockSave).toHaveBeenCalledWith(expect.objectContaining({ cacheKey: MOCK_CACHE_KEY }));
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.analysis.cacheKey).toBe(MOCK_CACHE_KEY);
    }
  });

  it('uses specified mode instead of auto-detect when provided', async () => {
    const result = await analyzeRepository(MOCK_REPO_PATH, 'fast');

    expect(mockAutoDetectMode).not.toHaveBeenCalled();
    expect(mockAnalyze).toHaveBeenCalledWith(MOCK_REPO_PATH, 'fast');
    expect(result.success).toBe(true);
  });

  it('returns error when analyzer throws', async () => {
    mockAnalyze.mockRejectedValue(new Error('Agent call failed'));

    const result = await analyzeRepository(MOCK_REPO_PATH);

    expect(result).toEqual({ success: false, error: 'Agent call failed' });
  });

  it('returns error for empty repositoryPath', async () => {
    const result = await analyzeRepository('');

    expect(result).toEqual({ success: false, error: 'repositoryPath must be an absolute path' });
    expect(mockCacheKeyResolve).not.toHaveBeenCalled();
  });

  it('returns error for relative repositoryPath', async () => {
    const result = await analyzeRepository('relative/path');

    expect(result).toEqual({ success: false, error: 'repositoryPath must be an absolute path' });
    expect(mockCacheKeyResolve).not.toHaveBeenCalled();
  });

  it('returns generic error for non-Error throws', async () => {
    mockAnalyze.mockRejectedValue('unexpected');

    const result = await analyzeRepository(MOCK_REPO_PATH);

    expect(result).toEqual({ success: false, error: 'Failed to analyze repository' });
  });

  it('returns error when cache key resolution fails', async () => {
    mockCacheKeyResolve.mockRejectedValue(new Error('git command failed'));

    const result = await analyzeRepository(MOCK_REPO_PATH);

    expect(result).toEqual({ success: false, error: 'git command failed' });
  });
});
