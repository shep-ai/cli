/**
 * GitPrService Rebase/Merge Extension Tests
 *
 * Tests for fetchOrigin, mergeLocalBranch, rebaseBranch, mergeAbort, and rebaseAbort.
 * TDD Phase: RED-GREEN
 */

import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GitPrService } from '@/infrastructure/services/git/git-pr.service';
import {
  GitPrError,
  GitPrErrorCode,
} from '@/application/ports/output/services/git-pr-service.interface';
import type { ExecFunction } from '@/infrastructure/services/git/worktree.service';

describe('GitPrService - batch rebase methods', () => {
  let mockExec: ExecFunction;
  let service: GitPrService;

  beforeEach(() => {
    mockExec = vi.fn();
    service = new GitPrService(mockExec);
  });

  describe('fetchOrigin', () => {
    it('should call git fetch origin with correct cwd', async () => {
      vi.mocked(mockExec).mockResolvedValue({ stdout: '', stderr: '' });

      await service.fetchOrigin('/repo');

      expect(mockExec).toHaveBeenCalledWith('git', ['fetch', 'origin'], { cwd: '/repo' });
    });

    it('should throw GitPrError with GIT_ERROR on failure', async () => {
      vi.mocked(mockExec).mockRejectedValue(new Error('fatal: not a git repository'));

      await expect(service.fetchOrigin('/repo')).rejects.toThrow(GitPrError);
      await expect(service.fetchOrigin('/repo')).rejects.toMatchObject({
        code: GitPrErrorCode.GIT_ERROR,
      });
    });

    it('should throw GitPrError with AUTH_FAILURE on auth errors', async () => {
      vi.mocked(mockExec).mockRejectedValue(new Error('Authentication failed for remote'));

      await expect(service.fetchOrigin('/repo')).rejects.toMatchObject({
        code: GitPrErrorCode.AUTH_FAILURE,
      });
    });
  });

  describe('mergeLocalBranch', () => {
    it('should call git merge with source and cwd', async () => {
      vi.mocked(mockExec).mockResolvedValue({ stdout: '', stderr: '' });

      await service.mergeLocalBranch('/repo', 'origin/main');

      expect(mockExec).toHaveBeenCalledWith('git', ['merge', 'origin/main'], { cwd: '/repo' });
    });

    it('should only call git merge — no checkout or push', async () => {
      vi.mocked(mockExec).mockResolvedValue({ stdout: '', stderr: '' });

      await service.mergeLocalBranch('/repo', 'origin/main');

      expect(mockExec).toHaveBeenCalledTimes(1);
      expect(mockExec).toHaveBeenCalledWith('git', ['merge', 'origin/main'], { cwd: '/repo' });
    });

    it('should throw GitPrError with MERGE_CONFLICT on conflict', async () => {
      vi.mocked(mockExec).mockRejectedValue(
        new Error('CONFLICT (content): Merge conflict in file.ts')
      );

      await expect(service.mergeLocalBranch('/repo', 'origin/main')).rejects.toMatchObject({
        code: GitPrErrorCode.MERGE_CONFLICT,
      });
    });

    it('should throw GitPrError with GIT_ERROR on other failures', async () => {
      vi.mocked(mockExec).mockRejectedValue(new Error('fatal: not a git repository'));

      await expect(service.mergeLocalBranch('/repo', 'origin/main')).rejects.toMatchObject({
        code: GitPrErrorCode.GIT_ERROR,
      });
    });
  });

  describe('rebaseBranch', () => {
    it('should call git rebase with onto and cwd', async () => {
      vi.mocked(mockExec).mockResolvedValue({ stdout: '', stderr: '' });

      await service.rebaseBranch('/repo', 'origin/main');

      expect(mockExec).toHaveBeenCalledWith('git', ['rebase', 'origin/main'], { cwd: '/repo' });
    });

    it('should throw GitPrError with MERGE_CONFLICT on rebase conflict', async () => {
      vi.mocked(mockExec).mockRejectedValue(
        new Error('CONFLICT (content): Merge conflict in file.ts')
      );

      await expect(service.rebaseBranch('/repo', 'origin/main')).rejects.toMatchObject({
        code: GitPrErrorCode.MERGE_CONFLICT,
      });
    });

    it('should throw GitPrError with GIT_ERROR on other failures', async () => {
      vi.mocked(mockExec).mockRejectedValue(new Error('fatal: not a git repository'));

      await expect(service.rebaseBranch('/repo', 'origin/main')).rejects.toMatchObject({
        code: GitPrErrorCode.GIT_ERROR,
      });
    });
  });

  describe('mergeAbort', () => {
    it('should call git merge --abort with cwd', async () => {
      vi.mocked(mockExec).mockResolvedValue({ stdout: '', stderr: '' });

      await service.mergeAbort('/repo');

      expect(mockExec).toHaveBeenCalledWith('git', ['merge', '--abort'], { cwd: '/repo' });
    });

    it('should throw GitPrError with GIT_ERROR on failure', async () => {
      vi.mocked(mockExec).mockRejectedValue(new Error('fatal: There is no merge to abort'));

      await expect(service.mergeAbort('/repo')).rejects.toThrow(GitPrError);
      await expect(service.mergeAbort('/repo')).rejects.toMatchObject({
        code: GitPrErrorCode.GIT_ERROR,
      });
    });
  });

  describe('rebaseAbort', () => {
    it('should call git rebase --abort with cwd', async () => {
      vi.mocked(mockExec).mockResolvedValue({ stdout: '', stderr: '' });

      await service.rebaseAbort('/repo');

      expect(mockExec).toHaveBeenCalledWith('git', ['rebase', '--abort'], { cwd: '/repo' });
    });

    it('should throw GitPrError with GIT_ERROR on failure', async () => {
      vi.mocked(mockExec).mockRejectedValue(new Error('fatal: No rebase in progress?'));

      await expect(service.rebaseAbort('/repo')).rejects.toThrow(GitPrError);
      await expect(service.rebaseAbort('/repo')).rejects.toMatchObject({
        code: GitPrErrorCode.GIT_ERROR,
      });
    });
  });
});
