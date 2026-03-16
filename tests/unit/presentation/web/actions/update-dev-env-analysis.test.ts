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

const { updateDevEnvAnalysis } = await import(
  '../../../../../src/presentation/web/app/actions/update-dev-env-analysis.js'
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
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    ...overrides,
  };
}

const mockCacheKeyResolve = vi.fn();
const mockFindByCacheKey = vi.fn();
const mockUpdate = vi.fn();

describe('updateDevEnvAnalysis server action', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAbsolute.mockImplementation((p: string) => /^\//.test(p));
    mockCacheKeyResolve.mockResolvedValue(MOCK_CACHE_KEY);
    mockFindByCacheKey.mockResolvedValue(makeMockAnalysis());
    mockUpdate.mockResolvedValue(undefined);

    mockResolve.mockImplementation((token: string) => {
      if (token === 'IRepoCacheKeyResolver') {
        return { resolve: mockCacheKeyResolve };
      }
      if (token === 'IDevEnvAnalysisRepository') {
        return { findByCacheKey: mockFindByCacheKey, update: mockUpdate };
      }
      return {};
    });
  });

  it('updates cached analysis with provided changes and sets source to Manual', async () => {
    const newCommands = [{ command: 'python manage.py runserver', description: 'Start Django' }];

    const result = await updateDevEnvAnalysis(MOCK_REPO_PATH, {
      commands: newCommands,
      language: 'Python',
    });

    expect(result).toEqual({ success: true });
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'analysis-123',
        cacheKey: MOCK_CACHE_KEY,
        commands: newCommands,
        language: 'Python',
        source: 'Manual',
      })
    );
  });

  it('returns error when no cached analysis exists', async () => {
    mockFindByCacheKey.mockResolvedValue(null);

    const result = await updateDevEnvAnalysis(MOCK_REPO_PATH, { language: 'Go' });

    expect(result).toEqual({
      success: false,
      error: 'No cached analysis found for this repository',
    });
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('preserves existing fields not included in updates', async () => {
    const result = await updateDevEnvAnalysis(MOCK_REPO_PATH, {
      canStart: false,
      reason: 'No server',
    });

    expect(result).toEqual({ success: true });
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        // Preserved from existing
        commands: [{ command: 'npm run dev', description: 'Start dev server' }],
        language: 'TypeScript',
        // Updated
        canStart: false,
        reason: 'No server',
        source: 'Manual',
      })
    );
  });

  it('returns error for empty repositoryPath', async () => {
    const result = await updateDevEnvAnalysis('', {});

    expect(result).toEqual({ success: false, error: 'repositoryPath must be an absolute path' });
    expect(mockCacheKeyResolve).not.toHaveBeenCalled();
  });

  it('returns error for relative repositoryPath', async () => {
    const result = await updateDevEnvAnalysis('relative/path', {});

    expect(result).toEqual({ success: false, error: 'repositoryPath must be an absolute path' });
  });

  it('returns error when update fails', async () => {
    mockUpdate.mockRejectedValue(new Error('database write error'));

    const result = await updateDevEnvAnalysis(MOCK_REPO_PATH, { language: 'Rust' });

    expect(result).toEqual({ success: false, error: 'database write error' });
  });
});
