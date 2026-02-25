/**
 * resolveRepository Unit Tests
 *
 * Tests for the shared helper that resolves a repository by exact or prefix ID,
 * following the resolve-run.ts pattern.
 */

import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Repository } from '@/domain/generated/output.js';

const { mockResolve } = vi.hoisted(() => ({
  mockResolve: vi.fn(),
}));

vi.mock('@/infrastructure/di/container.js', () => ({
  container: { resolve: (...args: unknown[]) => mockResolve(...args) },
}));

import { resolveRepository } from '../../../../../../src/presentation/cli/commands/repo/resolve-repository.js';

function makeRepository(overrides?: Partial<Repository>): Repository {
  return {
    id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    name: 'my-project',
    path: '/home/user/my-project',
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    ...overrides,
  };
}

describe('resolveRepository', () => {
  let mockFindById: ReturnType<typeof vi.fn>;
  let mockList: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockFindById = vi.fn();
    mockList = vi.fn().mockResolvedValue([]);
    mockResolve.mockReturnValue({
      findById: mockFindById,
      list: mockList,
    });
  });

  it('should resolve IRepositoryRepository via container', async () => {
    mockFindById.mockResolvedValue(makeRepository());
    await resolveRepository('a1b2c3d4-e5f6-7890-abcd-ef1234567890');
    expect(mockResolve).toHaveBeenCalledWith('IRepositoryRepository');
  });

  it('should return repository on exact findById match', async () => {
    const repo = makeRepository();
    mockFindById.mockResolvedValue(repo);

    const result = await resolveRepository('a1b2c3d4-e5f6-7890-abcd-ef1234567890');

    expect(result).toEqual({ repository: repo });
    expect(mockFindById).toHaveBeenCalledWith('a1b2c3d4-e5f6-7890-abcd-ef1234567890');
  });

  it('should return repository on unique prefix match when id.length < 36', async () => {
    const repo = makeRepository();
    mockFindById.mockResolvedValue(null);
    mockList.mockResolvedValue([repo]);

    const result = await resolveRepository('a1b2c3d4');

    expect(result).toEqual({ repository: repo });
  });

  it('should return error listing matches when multiple repos match prefix', async () => {
    const repo1 = makeRepository({ id: 'a1b2c3d4-0000-0000-0000-000000000001', name: 'repo-1' });
    const repo2 = makeRepository({ id: 'a1b2c3d4-0000-0000-0000-000000000002', name: 'repo-2' });
    mockFindById.mockResolvedValue(null);
    mockList.mockResolvedValue([repo1, repo2]);

    const result = await resolveRepository('a1b2');

    expect(result).toHaveProperty('error');
    expect((result as { error: string }).error).toContain('Multiple repositories match');
    expect((result as { error: string }).error).toContain('a1b2c3d4');
  });

  it('should return error when no match found', async () => {
    mockFindById.mockResolvedValue(null);
    mockList.mockResolvedValue([]);

    const result = await resolveRepository('nonexistent');

    expect(result).toEqual({ error: 'Repository not found: nonexistent' });
  });

  it('should skip prefix matching when id.length === 36 (full UUID)', async () => {
    const fullUuid = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
    mockFindById.mockResolvedValue(null);

    const result = await resolveRepository(fullUuid);

    expect(result).toEqual({ error: `Repository not found: ${fullUuid}` });
    expect(mockList).not.toHaveBeenCalled();
  });
});
