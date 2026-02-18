// @vitest-environment node

/**
 * computeWorktreePath Unit Tests
 *
 * Tests for the shared utility that computes the worktree path for a given
 * repository path and branch name.
 *
 * TDD Phase: RED → GREEN
 */

import { describe, it, expect, vi } from 'vitest';
import { createHash } from 'node:crypto';
import { join } from 'node:path';

vi.mock('node:os', () => ({
  homedir: () => '/mock',
}));

import { computeWorktreePath } from '@/infrastructure/services/ide-launchers/compute-worktree-path.js';

describe('computeWorktreePath', () => {
  it('should compute correct worktree path for repo and branch', () => {
    const repoPath = '/home/user/project';
    const branch = 'feat/my-feature';

    const expectedHash = createHash('sha256').update(repoPath).digest('hex').slice(0, 16);
    const expected = join('/mock/.shep', 'repos', expectedHash, 'wt', 'feat-my-feature');

    expect(computeWorktreePath(repoPath, branch)).toBe(expected);
  });

  it('should replace slashes in branch name with hyphens', () => {
    const result = computeWorktreePath('/repo', 'feat/some/nested/branch');
    expect(result).toContain('feat-some-nested-branch');
  });

  it('should handle single-segment branch name without slashes', () => {
    const result = computeWorktreePath('/repo', 'main');
    expect(result).toContain('wt/main');
  });

  it('should produce a deterministic 16-char hex hash of the repo path', () => {
    const result = computeWorktreePath('/home/user/project', 'main');
    const expectedHash = createHash('sha256')
      .update('/home/user/project')
      .digest('hex')
      .slice(0, 16);
    expect(result).toContain(`repos/${expectedHash}/`);
  });

  it('should produce different hashes for different repo paths', () => {
    const path1 = computeWorktreePath('/repo/a', 'main');
    const path2 = computeWorktreePath('/repo/b', 'main');
    expect(path1).not.toBe(path2);
  });

  it('should produce same path for same inputs', () => {
    const result1 = computeWorktreePath('/home/user/project', 'feat/test');
    const result2 = computeWorktreePath('/home/user/project', 'feat/test');
    expect(result1).toBe(result2);
  });
});
