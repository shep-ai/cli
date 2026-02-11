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
import { WorktreeService } from '../../../../../src/infrastructure/services/git/worktree.service.js';
import {
  WorktreeError,
  WorktreeErrorCode,
} from '../../../../../src/application/ports/output/worktree-service.interface.js';

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
      // Arrange: first call is `git worktree add`, second is `git worktree list`
      mockExecFile
        .mockResolvedValueOnce({ stdout: '', stderr: '' }) // git worktree add
        .mockResolvedValueOnce({
          // git worktree list --porcelain
          stdout: [
            'worktree /repo',
            'HEAD 111111',
            'branch refs/heads/main',
            '',
            'worktree /repo/.worktrees/my-branch',
            'HEAD abc123',
            'branch refs/heads/my-branch',
            '',
          ].join('\n'),
          stderr: '',
        });

      // Act
      const result = await service.create('/repo', 'my-branch', '/repo/.worktrees/my-branch');

      // Assert
      expect(mockExecFile).toHaveBeenCalledWith(
        'git',
        ['worktree', 'add', '/repo/.worktrees/my-branch', '-b', 'my-branch'],
        { cwd: '/repo' }
      );
      expect(result.branch).toBe('my-branch');
      expect(result.path).toBe('/repo/.worktrees/my-branch');
      expect(result.head).toBe('abc123');
    });

    it('should throw ALREADY_EXISTS when worktree path exists', async () => {
      // Arrange
      mockExecFile.mockRejectedValue(
        new Error("fatal: '/repo/.worktrees/my-branch' already exists")
      );

      // Act & Assert
      await expect(
        service.create('/repo', 'my-branch', '/repo/.worktrees/my-branch')
      ).rejects.toThrow(WorktreeError);

      try {
        await service.create('/repo', 'my-branch', '/repo/.worktrees/my-branch');
      } catch (e) {
        expect(e).toBeInstanceOf(WorktreeError);
        expect((e as WorktreeError).code).toBe(WorktreeErrorCode.ALREADY_EXISTS);
      }
    });

    it('should throw BRANCH_IN_USE when branch is checked out', async () => {
      // Arrange
      mockExecFile.mockRejectedValue(new Error("fatal: 'my-branch' is already checked out"));

      // Act & Assert
      await expect(
        service.create('/repo', 'my-branch', '/repo/.worktrees/my-branch')
      ).rejects.toThrow(WorktreeError);

      try {
        await service.create('/repo', 'my-branch', '/repo/.worktrees/my-branch');
      } catch (e) {
        expect(e).toBeInstanceOf(WorktreeError);
        expect((e as WorktreeError).code).toBe(WorktreeErrorCode.BRANCH_IN_USE);
      }
    });

    it('should throw GIT_ERROR for unknown git errors', async () => {
      // Arrange
      mockExecFile.mockRejectedValue(new Error('fatal: unknown error occurred'));

      // Act & Assert
      try {
        await service.create('/repo', 'my-branch', '/repo/.worktrees/my-branch');
      } catch (e) {
        expect(e).toBeInstanceOf(WorktreeError);
        expect((e as WorktreeError).code).toBe(WorktreeErrorCode.GIT_ERROR);
      }
    });

    it('should throw GIT_ERROR when created worktree not found in list', async () => {
      // Arrange: create succeeds but list returns empty
      mockExecFile
        .mockResolvedValueOnce({ stdout: '', stderr: '' })
        .mockResolvedValueOnce({ stdout: '', stderr: '' });

      // Act & Assert
      await expect(
        service.create('/repo', 'my-branch', '/repo/.worktrees/my-branch')
      ).rejects.toThrow(WorktreeError);
    });
  });

  describe('remove', () => {
    it('should remove worktree with correct git command', async () => {
      // Arrange
      mockExecFile.mockResolvedValue({ stdout: '', stderr: '' });

      // Act
      await service.remove('/repo/.worktrees/my-branch');

      // Assert
      expect(mockExecFile).toHaveBeenCalledWith(
        'git',
        ['worktree', 'remove', '/repo/.worktrees/my-branch'],
        {}
      );
    });

    it('should throw WorktreeError on failure', async () => {
      // Arrange
      mockExecFile.mockRejectedValue(
        new Error("fatal: '/repo/.worktrees/my-branch' is not a valid directory")
      );

      // Act & Assert
      await expect(service.remove('/repo/.worktrees/my-branch')).rejects.toThrow(WorktreeError);

      try {
        await service.remove('/repo/.worktrees/my-branch');
      } catch (e) {
        expect(e).toBeInstanceOf(WorktreeError);
        expect((e as WorktreeError).code).toBe(WorktreeErrorCode.NOT_FOUND);
      }
    });
  });

  describe('list', () => {
    it('should parse git worktree list --porcelain output', async () => {
      // Arrange
      mockExecFile.mockResolvedValue({
        stdout: [
          'worktree /repo',
          'HEAD abc123',
          'branch refs/heads/main',
          '',
          'worktree /repo/.worktrees/feat-1',
          'HEAD def456',
          'branch refs/heads/feat/feature-1',
          '',
        ].join('\n'),
        stderr: '',
      });

      // Act
      const worktrees = await service.list('/repo');

      // Assert
      expect(worktrees).toHaveLength(2);
      expect(worktrees[0]).toEqual({
        path: '/repo',
        head: 'abc123',
        branch: 'main',
        isMain: true,
      });
      expect(worktrees[1]).toEqual({
        path: '/repo/.worktrees/feat-1',
        head: 'def456',
        branch: 'feat/feature-1',
        isMain: false,
      });
    });

    it('should handle empty list', async () => {
      // Arrange
      mockExecFile.mockResolvedValue({ stdout: '', stderr: '' });

      // Act
      const worktrees = await service.list('/repo');

      // Assert
      expect(worktrees).toEqual([]);
    });

    it('should handle detached HEAD worktrees', async () => {
      // Arrange
      mockExecFile.mockResolvedValue({
        stdout: [
          'worktree /repo',
          'HEAD abc123',
          'branch refs/heads/main',
          '',
          'worktree /repo/.worktrees/detached',
          'HEAD def456',
          'detached',
          '',
        ].join('\n'),
        stderr: '',
      });

      // Act
      const worktrees = await service.list('/repo');

      // Assert
      expect(worktrees).toHaveLength(2);
      expect(worktrees[1]).toEqual({
        path: '/repo/.worktrees/detached',
        head: 'def456',
        branch: '',
        isMain: false,
      });
    });

    it('should call git with correct arguments', async () => {
      // Arrange
      mockExecFile.mockResolvedValue({ stdout: '', stderr: '' });

      // Act
      await service.list('/repo');

      // Assert
      expect(mockExecFile).toHaveBeenCalledWith('git', ['worktree', 'list', '--porcelain'], {
        cwd: '/repo',
      });
    });
  });

  describe('exists', () => {
    it('should return true when branch has a worktree', async () => {
      // Arrange
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

      // Act
      const result = await service.exists('/repo', 'feat/x');

      // Assert
      expect(result).toBe(true);
    });

    it('should return false when branch has no worktree', async () => {
      // Arrange
      mockExecFile.mockResolvedValue({
        stdout: ['worktree /repo', 'HEAD abc', 'branch refs/heads/main', ''].join('\n'),
        stderr: '',
      });

      // Act
      const result = await service.exists('/repo', 'feat/x');

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('getWorktreePath', () => {
    it('should compute conventional worktree path', () => {
      const result = service.getWorktreePath('/home/user/repo', 'feat/my-feature');
      expect(result).toBe('/home/user/repo/.worktrees/feat/my-feature');
    });

    it('should handle simple branch names', () => {
      const result = service.getWorktreePath('/repo', 'my-branch');
      expect(result).toBe('/repo/.worktrees/my-branch');
    });
  });
});
