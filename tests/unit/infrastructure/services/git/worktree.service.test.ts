/**
 * WorktreeService Unit Tests
 *
 * Tests for the git worktree management service.
 * Uses constructor-injected exec function mock (NOT vi.mock of child_process).
 *
 * TDD Phase: RED-GREEN
 */

import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WorktreeService } from '@/infrastructure/services/git/worktree.service.js';
import {
  WorktreeError,
  WorktreeErrorCode,
} from '@/application/ports/output/services/worktree-service.interface.js';

type ExecFileFn = (
  cmd: string,
  args: string[],
  options?: object
) => Promise<{ stdout: string; stderr: string }>;

describe('WorktreeService', () => {
  let service: WorktreeService;
  let mockExecFile: ReturnType<typeof vi.fn<ExecFileFn>>;

  beforeEach(() => {
    mockExecFile = vi.fn<ExecFileFn>();
    service = new WorktreeService(mockExecFile);
  });

  describe('create', () => {
    it('should create worktree with correct git command', async () => {
      const wtPath = service.getWorktreePath('/repo', 'my-branch');

      mockExecFile.mockResolvedValueOnce({ stdout: '', stderr: '' }).mockResolvedValueOnce({
        stdout: [
          'worktree /repo',
          'HEAD 111111',
          'branch refs/heads/main',
          '',
          `worktree ${wtPath}`,
          'HEAD abc123',
          'branch refs/heads/my-branch',
          '',
        ].join('\n'),
        stderr: '',
      });

      const result = await service.create('/repo', 'my-branch', wtPath);

      expect(mockExecFile).toHaveBeenCalledWith(
        'git',
        ['worktree', 'add', wtPath, '-b', 'my-branch'],
        { cwd: '/repo' }
      );
      expect(result.branch).toBe('my-branch');
      expect(result.path).toBe(wtPath);
      expect(result.head).toBe('abc123');
    });

    it('should throw ALREADY_EXISTS when worktree path exists', async () => {
      mockExecFile.mockRejectedValue(new Error("fatal: '/path' already exists"));

      await expect(service.create('/repo', 'my-branch', '/path')).rejects.toThrow(WorktreeError);

      try {
        await service.create('/repo', 'my-branch', '/path');
      } catch (e) {
        expect(e).toBeInstanceOf(WorktreeError);
        expect((e as WorktreeError).code).toBe(WorktreeErrorCode.ALREADY_EXISTS);
      }
    });

    it('should throw BRANCH_IN_USE when branch is checked out', async () => {
      mockExecFile.mockRejectedValue(new Error("fatal: 'my-branch' is already checked out"));

      await expect(service.create('/repo', 'my-branch', '/path')).rejects.toThrow(WorktreeError);

      try {
        await service.create('/repo', 'my-branch', '/path');
      } catch (e) {
        expect(e).toBeInstanceOf(WorktreeError);
        expect((e as WorktreeError).code).toBe(WorktreeErrorCode.BRANCH_IN_USE);
      }
    });

    it('should throw GIT_ERROR for unknown git errors', async () => {
      mockExecFile.mockRejectedValue(new Error('fatal: unknown error occurred'));

      try {
        await service.create('/repo', 'my-branch', '/path');
      } catch (e) {
        expect(e).toBeInstanceOf(WorktreeError);
        expect((e as WorktreeError).code).toBe(WorktreeErrorCode.GIT_ERROR);
      }
    });

    it('should throw GIT_ERROR when created worktree not found in list', async () => {
      mockExecFile
        .mockResolvedValueOnce({ stdout: '', stderr: '' })
        .mockResolvedValueOnce({ stdout: '', stderr: '' });

      await expect(service.create('/repo', 'my-branch', '/path')).rejects.toThrow(WorktreeError);
    });
  });

  describe('remove', () => {
    it('should remove worktree with correct git command', async () => {
      mockExecFile.mockResolvedValue({ stdout: '', stderr: '' });
      await service.remove('/some/wt/path');
      expect(mockExecFile).toHaveBeenCalledWith('git', ['worktree', 'remove', '/some/wt/path'], {});
    });

    it('should throw WorktreeError on failure', async () => {
      mockExecFile.mockRejectedValue(new Error("fatal: '/path' is not a valid directory"));
      await expect(service.remove('/path')).rejects.toThrow(WorktreeError);

      try {
        await service.remove('/path');
      } catch (e) {
        expect(e).toBeInstanceOf(WorktreeError);
        expect((e as WorktreeError).code).toBe(WorktreeErrorCode.NOT_FOUND);
      }
    });
  });

  describe('list', () => {
    it('should parse git worktree list --porcelain output', async () => {
      mockExecFile.mockResolvedValue({
        stdout: [
          'worktree /repo',
          'HEAD abc123',
          'branch refs/heads/main',
          '',
          'worktree /some/wt/path',
          'HEAD def456',
          'branch refs/heads/feat/feature-1',
          '',
        ].join('\n'),
        stderr: '',
      });

      const worktrees = await service.list('/repo');

      expect(worktrees).toHaveLength(2);
      expect(worktrees[0]).toEqual({
        path: '/repo',
        head: 'abc123',
        branch: 'main',
        isMain: true,
      });
      expect(worktrees[1]).toEqual({
        path: '/some/wt/path',
        head: 'def456',
        branch: 'feat/feature-1',
        isMain: false,
      });
    });

    it('should handle empty list', async () => {
      mockExecFile.mockResolvedValue({ stdout: '', stderr: '' });
      const worktrees = await service.list('/repo');
      expect(worktrees).toEqual([]);
    });

    it('should call git with correct arguments', async () => {
      mockExecFile.mockResolvedValue({ stdout: '', stderr: '' });
      await service.list('/repo');
      expect(mockExecFile).toHaveBeenCalledWith('git', ['worktree', 'list', '--porcelain'], {
        cwd: '/repo',
      });
    });
  });

  describe('exists', () => {
    it('should return true when branch has a worktree', async () => {
      mockExecFile.mockResolvedValue({
        stdout: [
          'worktree /repo',
          'HEAD abc',
          'branch refs/heads/main',
          '',
          'worktree /w',
          'HEAD def',
          'branch refs/heads/feat/x',
          '',
        ].join('\n'),
        stderr: '',
      });

      const result = await service.exists('/repo', 'feat/x');
      expect(result).toBe(true);
    });

    it('should return false when branch has no worktree', async () => {
      mockExecFile.mockResolvedValue({
        stdout: ['worktree /repo', 'HEAD abc', 'branch refs/heads/main', ''].join('\n'),
        stderr: '',
      });

      const result = await service.exists('/repo', 'feat/x');
      expect(result).toBe(false);
    });
  });

  describe('getWorktreePath', () => {
    it('should compute path under ~/.shep/repos/HASH/wt/SLUG', () => {
      const result = service.getWorktreePath('/home/user/repo', 'feat/my-feature');
      // Should NOT be inside the repo
      expect(result).not.toContain('/home/user/repo/');
      // Should be under ~/.shep/repos/
      expect(result).toContain('.shep/repos/');
      expect(result).toContain('/wt/');
      // Slashes in branch should be replaced with hyphens
      expect(result).toContain('feat-my-feature');
    });

    it('should produce consistent hash for same repo path', () => {
      const a = service.getWorktreePath('/my/repo', 'feat/a');
      const b = service.getWorktreePath('/my/repo', 'feat/b');
      // Same repo hash, different slug
      const aDir = a.split('/wt/')[0];
      const bDir = b.split('/wt/')[0];
      expect(aDir).toBe(bDir);
    });

    it('should produce different hashes for different repo paths', () => {
      const a = service.getWorktreePath('/repo-a', 'feat/x');
      const b = service.getWorktreePath('/repo-b', 'feat/x');
      expect(a).not.toBe(b);
    });
  });
});
