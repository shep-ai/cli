/**
 * GitPrService Unit Tests
 *
 * TDD Phase: RED-GREEN
 */

import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GitPrService } from '@/infrastructure/services/git/git-pr.service';
import {
  GitPrError,
  GitPrErrorCode,
} from '@/application/ports/output/services/git-pr-service.interface';
import { PrStatus } from '@/domain/generated/output';
import type { ExecFunction } from '@/infrastructure/services/git/worktree.service';

vi.mock('node:fs', async () => {
  const actual = await vi.importActual<object>('node:fs');
  return { ...actual, readFileSync: vi.fn() };
});

import { readFileSync } from 'node:fs';

describe('GitPrService', () => {
  let mockExec: ExecFunction;
  let service: GitPrService;

  beforeEach(() => {
    mockExec = vi.fn();
    service = new GitPrService(mockExec);
  });

  describe('hasUncommittedChanges', () => {
    it('should return true when git status has output', async () => {
      vi.mocked(mockExec).mockResolvedValue({
        stdout: ' M src/file.ts\n',
        stderr: '',
      });

      const result = await service.hasUncommittedChanges('/repo');

      expect(result).toBe(true);
      expect(mockExec).toHaveBeenCalledWith('git', ['status', '--porcelain'], { cwd: '/repo' });
    });

    it('should return false when git status is empty', async () => {
      vi.mocked(mockExec).mockResolvedValue({
        stdout: '',
        stderr: '',
      });

      const result = await service.hasUncommittedChanges('/repo');

      expect(result).toBe(false);
    });

    it('should return false when git status is whitespace only', async () => {
      vi.mocked(mockExec).mockResolvedValue({
        stdout: '  \n',
        stderr: '',
      });

      const result = await service.hasUncommittedChanges('/repo');

      expect(result).toBe(false);
    });
  });

  describe('commitAll', () => {
    it('should stage all changes, commit, and return SHA', async () => {
      vi.mocked(mockExec)
        .mockResolvedValueOnce({ stdout: '', stderr: '' }) // git add -A
        .mockResolvedValueOnce({ stdout: '', stderr: '' }) // git commit
        .mockResolvedValueOnce({ stdout: 'abc123def456\n', stderr: '' }); // git rev-parse HEAD

      const sha = await service.commitAll('/repo', 'feat: add feature');

      expect(sha).toBe('abc123def456');
      expect(mockExec).toHaveBeenNthCalledWith(1, 'git', ['add', '-A'], { cwd: '/repo' });
      expect(mockExec).toHaveBeenNthCalledWith(2, 'git', ['commit', '-m', 'feat: add feature'], {
        cwd: '/repo',
      });
      expect(mockExec).toHaveBeenNthCalledWith(3, 'git', ['rev-parse', 'HEAD'], { cwd: '/repo' });
    });

    it('should throw GitPrError with GIT_ERROR on failure', async () => {
      vi.mocked(mockExec).mockRejectedValue(new Error('fatal: not a git repository'));

      await expect(service.commitAll('/repo', 'msg')).rejects.toThrow(GitPrError);
      await expect(service.commitAll('/repo', 'msg')).rejects.toMatchObject({
        code: GitPrErrorCode.GIT_ERROR,
      });
    });
  });

  describe('push', () => {
    it('should call git push origin branch', async () => {
      vi.mocked(mockExec).mockResolvedValue({ stdout: '', stderr: '' });

      await service.push('/repo', 'feat/my-branch');

      expect(mockExec).toHaveBeenCalledWith('git', ['push', 'origin', 'feat/my-branch'], {
        cwd: '/repo',
      });
    });

    it('should add --set-upstream flag when setUpstream is true', async () => {
      vi.mocked(mockExec).mockResolvedValue({ stdout: '', stderr: '' });

      await service.push('/repo', 'feat/my-branch', true);

      expect(mockExec).toHaveBeenCalledWith(
        'git',
        ['push', '--set-upstream', 'origin', 'feat/my-branch'],
        { cwd: '/repo' }
      );
    });

    it('should throw GitPrError with MERGE_CONFLICT when stderr contains rejected', async () => {
      vi.mocked(mockExec).mockRejectedValue(new Error('error: failed to push some refs rejected'));

      await expect(service.push('/repo', 'feat/x')).rejects.toMatchObject({
        code: GitPrErrorCode.MERGE_CONFLICT,
      });
    });

    it('should throw GitPrError with AUTH_FAILURE on auth errors', async () => {
      vi.mocked(mockExec).mockRejectedValue(new Error('Authentication failed for repo'));

      await expect(service.push('/repo', 'feat/x')).rejects.toMatchObject({
        code: GitPrErrorCode.AUTH_FAILURE,
      });
    });
  });

  describe('createPr', () => {
    const prYaml = [
      'title: "feat: awesome feature"',
      'body: "## Summary\\n\\nDoes awesome things"',
      'baseBranch: main',
      'headBranch: feat/awesome',
      'labels:',
      '  - feature',
      'draft: false',
    ].join('\n');

    it('should parse pr.yaml and pass title/body to gh pr create', async () => {
      vi.mocked(readFileSync).mockReturnValue(prYaml);
      vi.mocked(mockExec).mockResolvedValueOnce({
        stdout: 'https://github.com/org/repo/pull/42\n',
        stderr: '',
      });

      const result = await service.createPr('/repo', '/repo/specs/pr.yaml');

      expect(readFileSync).toHaveBeenCalledWith('/repo/specs/pr.yaml', 'utf-8');
      expect(mockExec).toHaveBeenCalledWith(
        'gh',
        expect.arrayContaining([
          'pr',
          'create',
          '--title',
          'feat: awesome feature',
          '--body',
          expect.any(String),
          '--base',
          'main',
          '--head',
          'feat/awesome',
          '--label',
          'feature',
        ]),
        { cwd: '/repo' }
      );
      expect(result.url).toBe('https://github.com/org/repo/pull/42');
      expect(result.number).toBe(42);
    });

    it('should throw GitPrError with GH_NOT_FOUND when gh is not found', async () => {
      vi.mocked(readFileSync).mockReturnValue(prYaml);
      const error = new Error('ENOENT gh not found');
      (error as NodeJS.ErrnoException).code = 'ENOENT';
      vi.mocked(mockExec).mockRejectedValue(error);

      await expect(service.createPr('/repo', '/repo/pr.yaml')).rejects.toMatchObject({
        code: GitPrErrorCode.GH_NOT_FOUND,
      });
    });
  });

  describe('mergePr', () => {
    it('should call gh pr merge with prNumber and default squash strategy', async () => {
      vi.mocked(mockExec).mockResolvedValue({ stdout: '', stderr: '' });

      await service.mergePr('/repo', 42);

      expect(mockExec).toHaveBeenCalledWith('gh', ['pr', 'merge', '42', '--squash'], {
        cwd: '/repo',
      });
    });

    it('should call gh pr merge with specified strategy', async () => {
      vi.mocked(mockExec).mockResolvedValue({ stdout: '', stderr: '' });

      await service.mergePr('/repo', 42, 'rebase');

      expect(mockExec).toHaveBeenCalledWith('gh', ['pr', 'merge', '42', '--rebase'], {
        cwd: '/repo',
      });
    });

    it('should throw GitPrError with MERGE_FAILED on merge failure', async () => {
      vi.mocked(mockExec).mockRejectedValue(new Error('merge failed: not mergeable'));

      await expect(service.mergePr('/repo', 42)).rejects.toMatchObject({
        code: GitPrErrorCode.MERGE_FAILED,
      });
    });
  });

  describe('mergeBranch', () => {
    it('should checkout target, merge source, and push', async () => {
      vi.mocked(mockExec).mockResolvedValue({ stdout: '', stderr: '' });

      await service.mergeBranch('/repo', 'feat/my-branch', 'main');

      expect(mockExec).toHaveBeenNthCalledWith(1, 'git', ['checkout', 'main'], { cwd: '/repo' });
      expect(mockExec).toHaveBeenNthCalledWith(2, 'git', ['merge', 'feat/my-branch'], {
        cwd: '/repo',
      });
      expect(mockExec).toHaveBeenNthCalledWith(3, 'git', ['push'], { cwd: '/repo' });
    });

    it('should throw GitPrError with MERGE_CONFLICT on conflict', async () => {
      vi.mocked(mockExec)
        .mockResolvedValueOnce({ stdout: '', stderr: '' }) // checkout
        .mockRejectedValueOnce(new Error('CONFLICT (content): Merge conflict in file.ts'));

      await expect(service.mergeBranch('/repo', 'feat/x', 'main')).rejects.toMatchObject({
        code: GitPrErrorCode.MERGE_CONFLICT,
      });
    });
  });

  describe('deleteBranch', () => {
    it('should delete local branch', async () => {
      vi.mocked(mockExec).mockResolvedValue({ stdout: '', stderr: '' });

      await service.deleteBranch('/repo', 'feat/old');

      expect(mockExec).toHaveBeenCalledWith('git', ['branch', '-d', 'feat/old'], { cwd: '/repo' });
      expect(mockExec).toHaveBeenCalledTimes(1);
    });

    it('should also delete remote when deleteRemote is true', async () => {
      vi.mocked(mockExec).mockResolvedValue({ stdout: '', stderr: '' });

      await service.deleteBranch('/repo', 'feat/old', true);

      expect(mockExec).toHaveBeenNthCalledWith(1, 'git', ['branch', '-d', 'feat/old'], {
        cwd: '/repo',
      });
      expect(mockExec).toHaveBeenNthCalledWith(
        2,
        'git',
        ['push', 'origin', '--delete', 'feat/old'],
        {
          cwd: '/repo',
        }
      );
    });
  });

  describe('getCiStatus', () => {
    it('should parse gh run list JSON output', async () => {
      const ghOutput = JSON.stringify([
        {
          conclusion: 'success',
          url: 'https://github.com/org/repo/actions/runs/123',
        },
      ]);
      vi.mocked(mockExec).mockResolvedValue({ stdout: ghOutput, stderr: '' });

      const result = await service.getCiStatus('/repo', 'feat/branch');

      expect(mockExec).toHaveBeenCalledWith(
        'gh',
        ['run', 'list', '--branch', 'feat/branch', '--json', 'conclusion,url', '--limit', '1'],
        { cwd: '/repo' }
      );
      expect(result.status).toBe('success');
      expect(result.runUrl).toBe('https://github.com/org/repo/actions/runs/123');
    });

    it('should return pending when no runs found', async () => {
      vi.mocked(mockExec).mockResolvedValue({ stdout: '[]', stderr: '' });

      const result = await service.getCiStatus('/repo', 'feat/branch');

      expect(result.status).toBe('pending');
    });

    it('should return pending when conclusion is null', async () => {
      const ghOutput = JSON.stringify([
        { conclusion: null, url: 'https://github.com/org/repo/actions/runs/456' },
      ]);
      vi.mocked(mockExec).mockResolvedValue({ stdout: ghOutput, stderr: '' });

      const result = await service.getCiStatus('/repo', 'feat/branch');

      expect(result.status).toBe('pending');
    });
  });

  describe('watchCi', () => {
    it('should resolve run ID via gh run list then watch it', async () => {
      vi.mocked(mockExec)
        .mockResolvedValueOnce({
          // gh run list --branch ... --json databaseId --limit 1
          stdout: JSON.stringify([{ databaseId: 789 }]),
          stderr: '',
        })
        .mockResolvedValueOnce({
          // gh run watch 789 --exit-status
          stdout: 'Run completed: success\nhttps://github.com/org/repo/actions/runs/789\n',
          stderr: '',
        });

      const result = await service.watchCi('/repo', 'feat/branch');

      expect(mockExec).toHaveBeenNthCalledWith(
        1,
        'gh',
        ['run', 'list', '--branch', 'feat/branch', '--json', 'databaseId', '--limit', '1'],
        { cwd: '/repo' }
      );
      expect(mockExec).toHaveBeenNthCalledWith(
        2,
        'gh',
        ['run', 'watch', '789', '--exit-status'],
        expect.objectContaining({ cwd: '/repo' })
      );
      expect(result.status).toBe('success');
    });

    it('should return pending when no runs exist for the branch', async () => {
      vi.mocked(mockExec).mockResolvedValueOnce({
        stdout: '[]',
        stderr: '',
      });

      const result = await service.watchCi('/repo', 'feat/branch');

      expect(result.status).toBe('pending');
      expect(mockExec).toHaveBeenCalledTimes(1);
    });

    it('should return failure when gh run watch exits non-zero', async () => {
      vi.mocked(mockExec)
        .mockResolvedValueOnce({
          stdout: JSON.stringify([{ databaseId: 789 }]),
          stderr: '',
        })
        .mockRejectedValueOnce(new Error('exit code 1'));

      const result = await service.watchCi('/repo', 'feat/branch');

      expect(result.status).toBe('failure');
    });

    it('should throw GitPrError with CI_TIMEOUT on timeout', async () => {
      vi.mocked(mockExec)
        .mockResolvedValueOnce({
          stdout: JSON.stringify([{ databaseId: 789 }]),
          stderr: '',
        })
        .mockRejectedValueOnce(new Error('timed out waiting for run'));

      await expect(service.watchCi('/repo', 'feat/branch', 5000)).rejects.toMatchObject({
        code: GitPrErrorCode.CI_TIMEOUT,
      });
    });

    it('should pass timeout option to exec', async () => {
      vi.mocked(mockExec)
        .mockResolvedValueOnce({
          stdout: JSON.stringify([{ databaseId: 789 }]),
          stderr: '',
        })
        .mockResolvedValueOnce({
          stdout: 'completed success',
          stderr: '',
        });

      await service.watchCi('/repo', 'feat/branch', 30000);

      expect(mockExec).toHaveBeenNthCalledWith(2, 'gh', ['run', 'watch', '789', '--exit-status'], {
        cwd: '/repo',
        timeout: 30000,
      });
    });
  });

  describe('getPrDiffSummary', () => {
    it('should parse git diff --stat and log correctly', async () => {
      vi.mocked(mockExec)
        .mockResolvedValueOnce({
          // git diff --stat
          stdout:
            ' src/a.ts | 10 ++++---\n src/b.ts | 5 ++--\n 2 files changed, 8 insertions(+), 4 deletions(-)\n',
          stderr: '',
        })
        .mockResolvedValueOnce({
          // git log --oneline
          stdout: 'abc1234 feat: add A\ndef5678 feat: add B\nghi9012 fix: tweak\n',
          stderr: '',
        });

      const result = await service.getPrDiffSummary('/repo', 'main');

      expect(mockExec).toHaveBeenNthCalledWith(1, 'git', ['diff', '--stat', 'main...HEAD'], {
        cwd: '/repo',
      });
      expect(mockExec).toHaveBeenNthCalledWith(2, 'git', ['log', '--oneline', 'main...HEAD'], {
        cwd: '/repo',
      });
      expect(result.filesChanged).toBe(2);
      expect(result.additions).toBe(8);
      expect(result.deletions).toBe(4);
      expect(result.commitCount).toBe(3);
    });
  });

  describe('listPrStatuses', () => {
    it('should call gh pr list with correct arguments including headRefName', async () => {
      const ghOutput = JSON.stringify([
        {
          number: 42,
          state: 'OPEN',
          url: 'https://github.com/org/repo/pull/42',
          headRefName: 'feat/test',
        },
      ]);
      vi.mocked(mockExec).mockResolvedValue({ stdout: ghOutput, stderr: '' });

      await service.listPrStatuses('/repo');

      expect(mockExec).toHaveBeenCalledWith(
        'gh',
        [
          'pr',
          'list',
          '--json',
          'number,state,url,headRefName',
          '--state',
          'all',
          '--limit',
          '100',
        ],
        { cwd: '/repo' }
      );
    });

    it('should normalize state from UPPERCASE to PrStatus enum values', async () => {
      const ghOutput = JSON.stringify([
        {
          number: 1,
          state: 'OPEN',
          url: 'https://github.com/org/repo/pull/1',
          headRefName: 'feat/a',
        },
        {
          number: 2,
          state: 'MERGED',
          url: 'https://github.com/org/repo/pull/2',
          headRefName: 'feat/b',
        },
        {
          number: 3,
          state: 'CLOSED',
          url: 'https://github.com/org/repo/pull/3',
          headRefName: 'feat/c',
        },
      ]);
      vi.mocked(mockExec).mockResolvedValue({ stdout: ghOutput, stderr: '' });

      const result = await service.listPrStatuses('/repo');

      expect(result).toEqual([
        {
          number: 1,
          state: PrStatus.Open,
          url: 'https://github.com/org/repo/pull/1',
          headRefName: 'feat/a',
        },
        {
          number: 2,
          state: PrStatus.Merged,
          url: 'https://github.com/org/repo/pull/2',
          headRefName: 'feat/b',
        },
        {
          number: 3,
          state: PrStatus.Closed,
          url: 'https://github.com/org/repo/pull/3',
          headRefName: 'feat/c',
        },
      ]);
    });

    it('should return empty array when no PRs exist', async () => {
      vi.mocked(mockExec).mockResolvedValue({ stdout: '[]', stderr: '' });

      const result = await service.listPrStatuses('/repo');

      expect(result).toEqual([]);
    });

    it('should throw GitPrError on gh CLI failure', async () => {
      const error = new Error('gh: not found');
      (error as NodeJS.ErrnoException).code = 'ENOENT';
      vi.mocked(mockExec).mockRejectedValue(error);

      await expect(service.listPrStatuses('/repo')).rejects.toThrow(GitPrError);
      await expect(service.listPrStatuses('/repo')).rejects.toMatchObject({
        code: GitPrErrorCode.GH_NOT_FOUND,
      });
    });

    it('should throw GitPrError with AUTH_FAILURE on auth errors', async () => {
      vi.mocked(mockExec).mockRejectedValue(new Error('Authentication failed'));

      await expect(service.listPrStatuses('/repo')).rejects.toThrow(GitPrError);
      await expect(service.listPrStatuses('/repo')).rejects.toMatchObject({
        code: GitPrErrorCode.AUTH_FAILURE,
      });
    });
  });

  describe('verifyMerge', () => {
    it('should return true when feature branch is ancestor of base branch', async () => {
      vi.mocked(mockExec).mockResolvedValue({ stdout: '', stderr: '' });

      const result = await service.verifyMerge('/repo', 'feat/test', 'main');

      expect(result).toBe(true);
      expect(mockExec).toHaveBeenCalledWith(
        'git',
        ['merge-base', '--is-ancestor', 'feat/test', 'main'],
        { cwd: '/repo' }
      );
    });

    it('should return false when feature branch is NOT ancestor of base branch', async () => {
      vi.mocked(mockExec).mockRejectedValue(new Error('exit code 1'));

      const result = await service.verifyMerge('/repo', 'feat/test', 'main');

      expect(result).toBe(false);
    });
  });
});
