// @vitest-environment node

import 'reflect-metadata';

/**
 * RepoCacheKeyResolver Unit Tests
 *
 * Tests the three-level fallback cache key resolution:
 * 1. Git remote URL (primary)
 * 2. Root repo path via git-common-dir (fallback)
 * 3. Provided cwd (last resort)
 */

import { describe, it, expect, vi } from 'vitest';
import { RepoCacheKeyResolver } from '@/infrastructure/services/deployment/repo-cache-key-resolver.js';

function createMockExec(responses: Record<string, { stdout: string } | Error>) {
  return vi
    .fn()
    .mockImplementation((_file: string, args: string[], _options?: { cwd?: string }) => {
      const key = args.join(' ');
      const response = responses[key];
      if (response instanceof Error) {
        return Promise.reject(response);
      }
      return Promise.resolve(response ?? { stdout: '' });
    });
}

describe('RepoCacheKeyResolver', () => {
  it('should return trimmed git remote URL when available', async () => {
    const exec = createMockExec({
      'remote get-url origin': { stdout: 'git@github.com:org/repo.git\n' },
    });
    const resolver = new RepoCacheKeyResolver(exec);

    const result = await resolver.resolve('/some/path');

    expect(result).toBe('git@github.com:org/repo.git');
  });

  it('should return HTTPS remote URL when available', async () => {
    const exec = createMockExec({
      'remote get-url origin': { stdout: '  https://github.com/org/repo.git  \n' },
    });
    const resolver = new RepoCacheKeyResolver(exec);

    const result = await resolver.resolve('/some/path');

    expect(result).toBe('https://github.com/org/repo.git');
  });

  it('should fall back to root repo path when remote fails', async () => {
    const exec = createMockExec({
      'remote get-url origin': new Error('fatal: No such remote'),
      'rev-parse --git-common-dir': { stdout: '/home/user/repo/.git\n' },
    });
    const resolver = new RepoCacheKeyResolver(exec);

    const result = await resolver.resolve('/home/user/repo/subdir');

    // Should resolve to repo root (parent of .git)
    expect(result).toBe('/home/user/repo');
  });

  it('should resolve relative git-common-dir to absolute path', async () => {
    const exec = createMockExec({
      'remote get-url origin': new Error('fatal: No such remote'),
      'rev-parse --git-common-dir': { stdout: '.git\n' },
    });
    const resolver = new RepoCacheKeyResolver(exec);

    const result = await resolver.resolve('/home/user/repo');

    // .git relative to /home/user/repo → /home/user/repo/.git → parent /home/user/repo
    expect(result).toBe('/home/user/repo');
  });

  it('should fall back to cwd when both git commands fail', async () => {
    const exec = createMockExec({
      'remote get-url origin': new Error('fatal: not a git repository'),
      'rev-parse --git-common-dir': new Error('fatal: not a git repository'),
    });
    const resolver = new RepoCacheKeyResolver(exec);

    const result = await resolver.resolve('/some/non-git/directory');

    expect(result).toBe('/some/non-git/directory');
  });

  it('should fall back to root repo path when remote returns empty string', async () => {
    const exec = createMockExec({
      'remote get-url origin': { stdout: '  \n' },
      'rev-parse --git-common-dir': { stdout: '/repo/.git\n' },
    });
    const resolver = new RepoCacheKeyResolver(exec);

    const result = await resolver.resolve('/repo/worktree');

    expect(result).toBe('/repo');
  });

  it('should handle worktree git-common-dir pointing to shared .git', async () => {
    // Worktrees report git-common-dir as the main repo's .git directory
    const exec = createMockExec({
      'remote get-url origin': new Error('no remote'),
      'rev-parse --git-common-dir': {
        stdout: '/home/user/.shep/repos/abc123/.git\n',
      },
    });
    const resolver = new RepoCacheKeyResolver(exec);

    const result = await resolver.resolve('/home/user/.shep/repos/abc123/wt/feat-branch');

    expect(result).toBe('/home/user/.shep/repos/abc123');
  });

  it('should pass cwd option to exec calls', async () => {
    const exec = createMockExec({
      'remote get-url origin': { stdout: 'git@github.com:org/repo.git\n' },
    });
    const resolver = new RepoCacheKeyResolver(exec);

    await resolver.resolve('/my/project');

    expect(exec).toHaveBeenCalledWith('git', ['remote', 'get-url', 'origin'], {
      cwd: '/my/project',
    });
  });

  it('should fall back to cwd when git-common-dir returns empty', async () => {
    const exec = createMockExec({
      'remote get-url origin': new Error('no remote'),
      'rev-parse --git-common-dir': { stdout: '' },
    });
    const resolver = new RepoCacheKeyResolver(exec);

    const result = await resolver.resolve('/fallback/path');

    expect(result).toBe('/fallback/path');
  });
});
