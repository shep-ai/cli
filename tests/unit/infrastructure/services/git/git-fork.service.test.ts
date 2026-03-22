/**
 * GitForkService Unit Tests
 *
 * TDD Phase: RED-GREEN
 */

import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GitForkService } from '@/infrastructure/services/git/git-fork.service';
import { GitForkErrorCode } from '@/application/ports/output/services/git-fork-service.interface';
import type { ExecFunction } from '@/infrastructure/services/git/worktree.service';

describe('GitForkService', () => {
  let mockExec: ExecFunction;
  let service: GitForkService;

  beforeEach(() => {
    mockExec = vi.fn();
    service = new GitForkService(mockExec);
  });

  // ---------------------------------------------------------------------------
  // forkRepository
  // ---------------------------------------------------------------------------

  describe('forkRepository', () => {
    it('should fork the repo and remap remotes via gh repo fork', async () => {
      // gh repo view returns non-fork repo
      vi.mocked(mockExec)
        .mockResolvedValueOnce({
          stdout: JSON.stringify({ isFork: false, parent: null }),
          stderr: '',
        })
        // gh repo fork
        .mockResolvedValueOnce({ stdout: 'Forked repo', stderr: '' });

      await service.forkRepository('/repo');

      expect(mockExec).toHaveBeenCalledWith(
        'gh',
        ['repo', 'view', '--json', 'isFork,parent'],
        expect.objectContaining({ cwd: '/repo' })
      );
      expect(mockExec).toHaveBeenCalledWith(
        'gh',
        ['repo', 'fork', '--remote', '--remote-name', 'origin'],
        expect.objectContaining({ cwd: '/repo' })
      );
    });

    it('should be idempotent and handle "already exists" in stderr', async () => {
      vi.mocked(mockExec)
        // gh repo view returns non-fork
        .mockResolvedValueOnce({
          stdout: JSON.stringify({ isFork: false, parent: null }),
          stderr: '',
        })
        // gh repo fork returns "already exists" in stderr
        .mockResolvedValueOnce({
          stdout: '',
          stderr: 'Error: already exists',
        });

      // Should not throw
      await expect(service.forkRepository('/repo')).resolves.toBeUndefined();
    });

    it('should detect origin is already a fork and ensure upstream remote exists', async () => {
      vi.mocked(mockExec)
        // gh repo view returns isFork = true with a parent
        .mockResolvedValueOnce({
          stdout: JSON.stringify({
            isFork: true,
            parent: { nameWithOwner: 'upstream-org/repo' },
          }),
          stderr: '',
        })
        // git remote — upstream not listed
        .mockResolvedValueOnce({ stdout: 'origin\n', stderr: '' })
        // git remote add upstream
        .mockResolvedValueOnce({ stdout: '', stderr: '' });

      await service.forkRepository('/repo');

      expect(mockExec).toHaveBeenCalledWith(
        'git',
        ['remote'],
        expect.objectContaining({ cwd: '/repo' })
      );
      expect(mockExec).toHaveBeenCalledWith(
        'git',
        ['remote', 'add', 'upstream', 'https://github.com/upstream-org/repo.git'],
        expect.objectContaining({ cwd: '/repo' })
      );
    });

    it('should not add upstream remote if it already exists', async () => {
      vi.mocked(mockExec)
        // gh repo view returns isFork = true
        .mockResolvedValueOnce({
          stdout: JSON.stringify({
            isFork: true,
            parent: { nameWithOwner: 'upstream-org/repo' },
          }),
          stderr: '',
        })
        // git remote — upstream already listed
        .mockResolvedValueOnce({ stdout: 'origin\nupstream\n', stderr: '' });

      await service.forkRepository('/repo');

      // git remote add should NOT be called
      expect(mockExec).not.toHaveBeenCalledWith(
        'git',
        expect.arrayContaining(['remote', 'add', 'upstream']),
        expect.anything()
      );
    });

    it('should throw AUTH_FAILURE for authentication errors', async () => {
      vi.mocked(mockExec)
        // gh repo view
        .mockResolvedValueOnce({
          stdout: JSON.stringify({ isFork: false, parent: null }),
          stderr: '',
        })
        // gh repo fork — auth error
        .mockRejectedValueOnce(new Error('authentication required'));

      await expect(service.forkRepository('/repo')).rejects.toMatchObject({
        name: 'GitForkError',
        code: GitForkErrorCode.AUTH_FAILURE,
      });
    });

    it('should throw FORK_FAILED for non-auth errors', async () => {
      vi.mocked(mockExec)
        .mockResolvedValueOnce({
          stdout: JSON.stringify({ isFork: false, parent: null }),
          stderr: '',
        })
        .mockRejectedValueOnce(new Error('network timeout'));

      await expect(service.forkRepository('/repo')).rejects.toMatchObject({
        code: GitForkErrorCode.FORK_FAILED,
      });
    });
  });

  // ---------------------------------------------------------------------------
  // pushToFork
  // ---------------------------------------------------------------------------

  describe('pushToFork', () => {
    it('should push the branch to origin with -u flag', async () => {
      vi.mocked(mockExec).mockResolvedValueOnce({ stdout: '', stderr: '' });

      await service.pushToFork('/repo', 'feature-branch');

      expect(mockExec).toHaveBeenCalledWith(
        'git',
        ['push', '-u', 'origin', 'feature-branch'],
        expect.objectContaining({ cwd: '/repo' })
      );
    });

    it('should throw PUSH_FAILED on git push error', async () => {
      vi.mocked(mockExec).mockRejectedValueOnce(new Error('remote: Permission denied'));

      await expect(service.pushToFork('/repo', 'feature-branch')).rejects.toMatchObject({
        code: GitForkErrorCode.PUSH_FAILED,
      });
    });

    it('should throw AUTH_FAILURE on authentication errors during push', async () => {
      vi.mocked(mockExec).mockRejectedValueOnce(new Error('authentication failed'));

      await expect(service.pushToFork('/repo', 'feature-branch')).rejects.toMatchObject({
        code: GitForkErrorCode.AUTH_FAILURE,
      });
    });
  });

  // ---------------------------------------------------------------------------
  // createUpstreamPr
  // ---------------------------------------------------------------------------

  describe('createUpstreamPr', () => {
    it('should create a PR against upstream and return url and number', async () => {
      vi.mocked(mockExec)
        // git remote get-url upstream
        .mockResolvedValueOnce({
          stdout: 'https://github.com/upstream-org/repo.git\n',
          stderr: '',
        })
        // gh pr create
        .mockResolvedValueOnce({
          stdout: 'https://github.com/upstream-org/repo/pull/42\n',
          stderr: '',
        });

      const result = await service.createUpstreamPr(
        '/repo',
        'My PR title',
        'PR body text',
        'my-fork:feature-branch',
        'main'
      );

      expect(result).toEqual({
        url: 'https://github.com/upstream-org/repo/pull/42',
        number: 42,
      });

      expect(mockExec).toHaveBeenCalledWith(
        'gh',
        [
          'pr',
          'create',
          '--repo',
          'upstream-org/repo',
          '--title',
          'My PR title',
          '--body',
          'PR body text',
          '--head',
          'my-fork:feature-branch',
          '--base',
          'main',
        ],
        expect.objectContaining({ cwd: '/repo' })
      );
    });

    it('should fall back to gh repo view parent when upstream remote is missing', async () => {
      vi.mocked(mockExec)
        // git remote get-url upstream — fails (no upstream remote)
        .mockRejectedValueOnce(new Error('No such remote'))
        // gh repo view --json parent
        .mockResolvedValueOnce({
          stdout: JSON.stringify({ parent: { nameWithOwner: 'upstream-org/repo' } }),
          stderr: '',
        })
        // gh pr create
        .mockResolvedValueOnce({
          stdout: 'https://github.com/upstream-org/repo/pull/7\n',
          stderr: '',
        });

      const result = await service.createUpstreamPr(
        '/repo',
        'Title',
        'Body',
        'fork:branch',
        'main'
      );

      expect(result).toEqual({
        url: 'https://github.com/upstream-org/repo/pull/7',
        number: 7,
      });
    });

    it('should throw UPSTREAM_PR_FAILED on gh pr create error', async () => {
      vi.mocked(mockExec)
        .mockResolvedValueOnce({
          stdout: 'https://github.com/upstream-org/repo.git\n',
          stderr: '',
        })
        .mockRejectedValueOnce(new Error('gh: command failed'));

      await expect(
        service.createUpstreamPr('/repo', 'Title', 'Body', 'fork:branch', 'main')
      ).rejects.toMatchObject({ code: GitForkErrorCode.UPSTREAM_PR_FAILED });
    });

    it('should throw AUTH_FAILURE on auth error during PR creation', async () => {
      vi.mocked(mockExec)
        .mockResolvedValueOnce({
          stdout: 'https://github.com/upstream-org/repo.git\n',
          stderr: '',
        })
        .mockRejectedValueOnce(new Error('authentication required'));

      await expect(
        service.createUpstreamPr('/repo', 'Title', 'Body', 'fork:branch', 'main')
      ).rejects.toMatchObject({ code: GitForkErrorCode.AUTH_FAILURE });
    });
  });

  // ---------------------------------------------------------------------------
  // getUpstreamPrStatus
  // ---------------------------------------------------------------------------

  describe('getUpstreamPrStatus', () => {
    it('should return open status for an open PR', async () => {
      vi.mocked(mockExec).mockResolvedValueOnce({
        stdout: JSON.stringify({
          state: 'OPEN',
          url: 'https://github.com/upstream-org/repo/pull/42',
          number: 42,
        }),
        stderr: '',
      });

      const result = await service.getUpstreamPrStatus('upstream-org/repo', 42);

      expect(result).toEqual({
        state: 'open',
        url: 'https://github.com/upstream-org/repo/pull/42',
        number: 42,
      });
      expect(mockExec).toHaveBeenCalledWith(
        'gh',
        ['pr', 'view', '42', '--repo', 'upstream-org/repo', '--json', 'state,url,number'],
        expect.any(Object)
      );
    });

    it('should return merged status for a merged PR', async () => {
      vi.mocked(mockExec).mockResolvedValueOnce({
        stdout: JSON.stringify({
          state: 'MERGED',
          url: 'https://github.com/upstream-org/repo/pull/10',
          number: 10,
        }),
        stderr: '',
      });

      const result = await service.getUpstreamPrStatus('upstream-org/repo', 10);

      expect(result).toEqual({
        state: 'merged',
        url: 'https://github.com/upstream-org/repo/pull/10',
        number: 10,
      });
    });

    it('should return closed status for a closed PR', async () => {
      vi.mocked(mockExec).mockResolvedValueOnce({
        stdout: JSON.stringify({
          state: 'CLOSED',
          url: 'https://github.com/upstream-org/repo/pull/5',
          number: 5,
        }),
        stderr: '',
      });

      const result = await service.getUpstreamPrStatus('upstream-org/repo', 5);

      expect(result).toEqual({
        state: 'closed',
        url: 'https://github.com/upstream-org/repo/pull/5',
        number: 5,
      });
    });

    it('should throw UPSTREAM_PR_NOT_FOUND when the PR does not exist', async () => {
      vi.mocked(mockExec).mockRejectedValueOnce(new Error('no pull requests found'));

      await expect(service.getUpstreamPrStatus('upstream-org/repo', 999)).rejects.toMatchObject({
        code: GitForkErrorCode.UPSTREAM_PR_NOT_FOUND,
      });
    });

    it('should throw AUTH_FAILURE on authentication errors', async () => {
      vi.mocked(mockExec).mockRejectedValueOnce(new Error('authentication required'));

      await expect(service.getUpstreamPrStatus('upstream-org/repo', 42)).rejects.toMatchObject({
        code: GitForkErrorCode.AUTH_FAILURE,
      });
    });
  });
});
