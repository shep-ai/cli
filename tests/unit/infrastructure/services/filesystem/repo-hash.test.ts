// @vitest-environment node

/**
 * computeRepoHash Unit Tests
 *
 * Tests for the shared utility that computes a deterministic SHA-256 hash
 * prefix from a repository path. Used by worktree path computation and
 * shep-managed spec storage.
 */

import { describe, it, expect } from 'vitest';
import { createHash } from 'node:crypto';
import { computeRepoHash } from '@/infrastructure/services/filesystem/repo-hash.js';

describe('computeRepoHash', () => {
  it('should return a 16 character hex string', () => {
    const result = computeRepoHash('/home/user/project');
    expect(result).toMatch(/^[0-9a-f]{16}$/);
  });

  it('should return the first 16 chars of the SHA-256 hash', () => {
    const repoPath = '/home/user/project';
    const expected = createHash('sha256').update(repoPath).digest('hex').slice(0, 16);
    expect(computeRepoHash(repoPath)).toBe(expected);
  });

  it('should normalize backslashes before hashing (C:\\foo and C:/foo produce same hash)', () => {
    const hashWithForward = computeRepoHash('C:/Users/dev/project');
    const hashWithBack = computeRepoHash('C:\\Users\\dev\\project');
    expect(hashWithForward).toBe(hashWithBack);
  });

  it('should produce deterministic output for the same input', () => {
    const result1 = computeRepoHash('/home/user/project');
    const result2 = computeRepoHash('/home/user/project');
    expect(result1).toBe(result2);
  });

  it('should produce different output for different paths', () => {
    const hash1 = computeRepoHash('/repo/a');
    const hash2 = computeRepoHash('/repo/b');
    expect(hash1).not.toBe(hash2);
  });

  it('should handle paths with trailing slashes', () => {
    const result = computeRepoHash('/home/user/project/');
    expect(result).toMatch(/^[0-9a-f]{16}$/);
  });

  it('should handle empty string', () => {
    const result = computeRepoHash('');
    expect(result).toMatch(/^[0-9a-f]{16}$/);
  });
});
