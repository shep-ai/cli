/**
 * GitHubRepositoryService Unit Tests
 *
 * Tests for auth check, repo listing, URL parsing, and clone operations
 * using mocked ExecFunction and spawn.
 */

import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { EventEmitter } from 'node:events';
import { GitHubRepositoryService } from '@/infrastructure/services/external/github-repository.service.js';
import {
  GitHubAuthError,
  GitHubCloneError,
  GitHubForkError,
  GitHubRepoListError,
  GitHubUrlParseError,
} from '@/application/ports/output/services/github-repository-service.interface.js';

// Mock child_process.spawn
vi.mock('node:child_process', () => ({
  spawn: vi.fn(),
}));

// Mock fs/promises.rm
vi.mock('node:fs/promises', () => ({
  rm: vi.fn().mockResolvedValue(undefined),
}));

import { spawn } from 'node:child_process';
import { rm } from 'node:fs/promises';

const mockSpawn = spawn as unknown as Mock;
const mockRm = rm as unknown as Mock;

describe('GitHubRepositoryService', () => {
  let service: GitHubRepositoryService;
  let mockExecFile: Mock;

  beforeEach(() => {
    vi.clearAllMocks();
    mockExecFile = vi.fn();
    service = new GitHubRepositoryService(mockExecFile as any);
  });

  // -------------------------------------------------------------------------
  // checkAuth
  // -------------------------------------------------------------------------

  describe('checkAuth()', () => {
    it('should succeed when gh auth token exits 0', async () => {
      mockExecFile.mockResolvedValue({ stdout: 'gho_xxxx', stderr: '' });

      await expect(service.checkAuth()).resolves.toBeUndefined();
      expect(mockExecFile).toHaveBeenCalledWith('gh', ['auth', 'token']);
    });

    it('should throw GitHubAuthError when gh auth token fails', async () => {
      mockExecFile.mockRejectedValue(new Error('not logged in'));

      await expect(service.checkAuth()).rejects.toThrow(GitHubAuthError);
      await expect(service.checkAuth()).rejects.toThrow('not authenticated');
    });

    it('should throw GitHubAuthError with specific message when gh is not installed', async () => {
      const err = new Error('spawn gh ENOENT') as NodeJS.ErrnoException;
      err.code = 'ENOENT';
      mockExecFile.mockRejectedValue(err);

      await expect(service.checkAuth()).rejects.toThrow(GitHubAuthError);
      await expect(service.checkAuth()).rejects.toThrow('not installed');
    });
  });

  // -------------------------------------------------------------------------
  // listUserRepositories
  // -------------------------------------------------------------------------

  describe('listUserRepositories()', () => {
    const sampleRepos = [
      {
        name: 'my-project',
        nameWithOwner: 'octocat/my-project',
        description: 'A sample project',
        isPrivate: false,
        pushedAt: '2024-01-15T10:30:00Z',
      },
      {
        name: 'secret-project',
        nameWithOwner: 'octocat/secret-project',
        description: '',
        isPrivate: true,
        pushedAt: '2024-01-14T08:00:00Z',
      },
    ];

    it('should parse JSON output from gh repo list', async () => {
      mockExecFile.mockResolvedValue({ stdout: JSON.stringify(sampleRepos), stderr: '' });

      const result = await service.listUserRepositories();

      expect(result).toEqual(sampleRepos);
      expect(mockExecFile).toHaveBeenCalledWith(
        'gh',
        expect.arrayContaining([
          'repo',
          'list',
          '--json',
          'name,nameWithOwner,description,isPrivate,pushedAt',
        ])
      );
    });

    it('should pass --limit flag', async () => {
      mockExecFile.mockResolvedValue({ stdout: '[]', stderr: '' });

      await service.listUserRepositories({ limit: 10 });

      expect(mockExecFile).toHaveBeenCalledWith('gh', expect.arrayContaining(['--limit', '10']));
    });

    it('should use default limit of 30', async () => {
      mockExecFile.mockResolvedValue({ stdout: '[]', stderr: '' });

      await service.listUserRepositories();

      expect(mockExecFile).toHaveBeenCalledWith('gh', expect.arrayContaining(['--limit', '30']));
    });

    it('should pass -q jq filter when search is provided', async () => {
      mockExecFile.mockResolvedValue({ stdout: '[]', stderr: '' });

      await service.listUserRepositories({ search: 'my-proj' });

      expect(mockExecFile).toHaveBeenCalledWith(
        'gh',
        expect.arrayContaining(['-q', '[.[] | select(.name | test("my-proj"; "i"))]'])
      );
    });

    it('should throw GitHubRepoListError on failure', async () => {
      mockExecFile.mockRejectedValue(new Error('network error'));

      await expect(service.listUserRepositories()).rejects.toThrow(GitHubRepoListError);
    });

    it('should throw GitHubRepoListError when gh is not installed', async () => {
      const err = new Error('spawn gh ENOENT') as NodeJS.ErrnoException;
      err.code = 'ENOENT';
      mockExecFile.mockRejectedValue(err);

      await expect(service.listUserRepositories()).rejects.toThrow(GitHubRepoListError);
      await expect(service.listUserRepositories()).rejects.toThrow('not installed');
    });
  });

  // -------------------------------------------------------------------------
  // parseGitHubUrl
  // -------------------------------------------------------------------------

  describe('parseGitHubUrl()', () => {
    it('should parse https://github.com/owner/repo', () => {
      const result = service.parseGitHubUrl('https://github.com/octocat/hello-world');

      expect(result).toEqual({
        owner: 'octocat',
        repo: 'hello-world',
        nameWithOwner: 'octocat/hello-world',
      });
    });

    it('should parse https://github.com/owner/repo.git', () => {
      const result = service.parseGitHubUrl('https://github.com/octocat/hello-world.git');

      expect(result).toEqual({
        owner: 'octocat',
        repo: 'hello-world',
        nameWithOwner: 'octocat/hello-world',
      });
    });

    it('should parse git@github.com:owner/repo.git', () => {
      const result = service.parseGitHubUrl('git@github.com:octocat/hello-world.git');

      expect(result).toEqual({
        owner: 'octocat',
        repo: 'hello-world',
        nameWithOwner: 'octocat/hello-world',
      });
    });

    it('should parse owner/repo shorthand', () => {
      const result = service.parseGitHubUrl('octocat/hello-world');

      expect(result).toEqual({
        owner: 'octocat',
        repo: 'hello-world',
        nameWithOwner: 'octocat/hello-world',
      });
    });

    it('should throw GitHubUrlParseError for non-GitHub URLs', () => {
      expect(() => service.parseGitHubUrl('https://gitlab.com/owner/repo')).toThrow(
        GitHubUrlParseError
      );
    });

    it('should throw GitHubUrlParseError for malformed input', () => {
      expect(() => service.parseGitHubUrl('not-a-url')).toThrow(GitHubUrlParseError);
    });

    it('should throw GitHubUrlParseError for empty input', () => {
      expect(() => service.parseGitHubUrl('')).toThrow(GitHubUrlParseError);
    });

    it('should throw GitHubUrlParseError for whitespace-only input', () => {
      expect(() => service.parseGitHubUrl('  ')).toThrow(GitHubUrlParseError);
    });

    it('should handle URLs with trailing whitespace', () => {
      const result = service.parseGitHubUrl('  https://github.com/octocat/hello-world  ');

      expect(result.nameWithOwner).toBe('octocat/hello-world');
    });

    it('should handle owner/repo with dots and underscores', () => {
      const result = service.parseGitHubUrl('my_org.inc/my.repo_v2');

      expect(result).toEqual({
        owner: 'my_org.inc',
        repo: 'my.repo_v2',
        nameWithOwner: 'my_org.inc/my.repo_v2',
      });
    });
  });

  // -------------------------------------------------------------------------
  // cloneRepository
  // -------------------------------------------------------------------------

  describe('cloneRepository()', () => {
    function createMockChildProcess() {
      const cp = new EventEmitter() as EventEmitter & {
        stdout: EventEmitter;
        stderr: EventEmitter;
      };
      cp.stdout = new EventEmitter();
      cp.stderr = new EventEmitter();
      return cp;
    }

    it('should spawn gh with correct args', async () => {
      const child = createMockChildProcess();
      mockSpawn.mockReturnValue(child);

      const promise = service.cloneRepository('octocat/hello-world', '/tmp/hello-world');

      // Simulate successful clone
      child.emit('close', 0);
      await promise;

      expect(mockSpawn).toHaveBeenCalledWith(
        'gh',
        ['repo', 'clone', 'octocat/hello-world', expect.any(String)],
        expect.objectContaining({ stdio: ['ignore', 'pipe', 'pipe'] })
      );
    });

    it('should resolve on exit code 0', async () => {
      const child = createMockChildProcess();
      mockSpawn.mockReturnValue(child);

      const promise = service.cloneRepository('octocat/hello-world', '/tmp/hello-world');
      child.emit('close', 0);

      await expect(promise).resolves.toBeUndefined();
    });

    it('should reject with GitHubCloneError on non-zero exit', async () => {
      const child = createMockChildProcess();
      mockSpawn.mockReturnValue(child);

      const promise = service.cloneRepository('octocat/hello-world', '/tmp/hello-world');
      child.stderr.emit('data', Buffer.from('fatal: repo not found'));
      child.emit('close', 128);

      await expect(promise).rejects.toThrow(GitHubCloneError);
    });

    it('should call onProgress with stderr data', async () => {
      const child = createMockChildProcess();
      mockSpawn.mockReturnValue(child);
      const onProgress = vi.fn();

      const promise = service.cloneRepository('octocat/hello-world', '/tmp/hello-world', {
        onProgress,
      });

      child.stderr.emit('data', Buffer.from('Receiving objects: 50%'));
      child.stderr.emit('data', Buffer.from('Receiving objects: 100%'));
      child.emit('close', 0);

      await promise;

      expect(onProgress).toHaveBeenCalledTimes(2);
      expect(onProgress).toHaveBeenCalledWith('Receiving objects: 50%');
      expect(onProgress).toHaveBeenCalledWith('Receiving objects: 100%');
    });

    it('should reject with GitHubCloneError for path traversal in destination', async () => {
      await expect(
        service.cloneRepository('octocat/hello-world', '/tmp/../etc/passwd')
      ).rejects.toThrow(GitHubCloneError);
      await expect(
        service.cloneRepository('octocat/hello-world', '/tmp/../etc/passwd')
      ).rejects.toThrow('path traversal');
    });

    it('should clean up partial clone on failure', async () => {
      const child = createMockChildProcess();
      mockSpawn.mockReturnValue(child);

      const promise = service.cloneRepository('octocat/hello-world', '/tmp/hello-world');
      child.emit('close', 1);

      await expect(promise).rejects.toThrow(GitHubCloneError);
      expect(mockRm).toHaveBeenCalledWith(expect.any(String), {
        recursive: true,
        force: true,
      });
    });

    it('should handle spawn error event', async () => {
      const child = createMockChildProcess();
      mockSpawn.mockReturnValue(child);

      const promise = service.cloneRepository('octocat/hello-world', '/tmp/hello-world');
      child.emit('error', new Error('spawn ENOENT'));

      await expect(promise).rejects.toThrow(GitHubCloneError);
      expect(mockRm).toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // checkPushAccess
  // -------------------------------------------------------------------------

  describe('checkPushAccess()', () => {
    it('should return true when gh api returns "true"', async () => {
      mockExecFile.mockResolvedValue({ stdout: 'true\n', stderr: '' });

      const result = await service.checkPushAccess('shep-ai/cli');

      expect(result).toBe(true);
      expect(mockExecFile).toHaveBeenCalledWith('gh', [
        'api',
        'repos/shep-ai/cli',
        '--jq',
        '.permissions.push',
      ]);
    });

    it('should return false when gh api returns "false"', async () => {
      mockExecFile.mockResolvedValue({ stdout: 'false\n', stderr: '' });

      const result = await service.checkPushAccess('shep-ai/cli');

      expect(result).toBe(false);
    });

    it('should return false when gh api throws an error (network failure)', async () => {
      mockExecFile.mockRejectedValue(new Error('network error'));

      const result = await service.checkPushAccess('shep-ai/cli');

      expect(result).toBe(false);
    });

    it('should return false when gh api throws ENOENT (gh not installed)', async () => {
      const err = new Error('spawn gh ENOENT') as NodeJS.ErrnoException;
      err.code = 'ENOENT';
      mockExecFile.mockRejectedValue(err);

      const result = await service.checkPushAccess('shep-ai/cli');

      expect(result).toBe(false);
    });

    it('should return false when gh api returns unexpected output', async () => {
      mockExecFile.mockResolvedValue({ stdout: 'null\n', stderr: '' });

      const result = await service.checkPushAccess('shep-ai/cli');

      expect(result).toBe(false);
    });

    it('should return false when gh api returns empty string', async () => {
      mockExecFile.mockResolvedValue({ stdout: '', stderr: '' });

      const result = await service.checkPushAccess('shep-ai/cli');

      expect(result).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // forkRepository
  // -------------------------------------------------------------------------

  describe('forkRepository()', () => {
    it('should create a new fork and return nameWithOwner + cloneUrl', async () => {
      mockExecFile.mockResolvedValue({
        stdout: JSON.stringify({
          nameWithOwner: 'myuser/cli',
          url: 'https://github.com/myuser/cli',
        }),
        stderr: '',
      });

      const result = await service.forkRepository('shep-ai/cli');

      expect(result.nameWithOwner).toBe('myuser/cli');
      expect(result.cloneUrl).toBe('https://github.com/myuser/cli.git');
      expect(mockExecFile).toHaveBeenCalledWith('gh', [
        'repo',
        'fork',
        'shep-ai/cli',
        '--clone=false',
        '--json',
        'nameWithOwner,url',
      ]);
    });

    it('should detect existing fork and return it (idempotent)', async () => {
      mockExecFile.mockResolvedValue({
        stdout: JSON.stringify({
          nameWithOwner: 'myuser/cli',
          url: 'https://github.com/myuser/cli',
        }),
        stderr: 'myuser/cli already exists',
      });

      const result = await service.forkRepository('shep-ai/cli');

      expect(result.nameWithOwner).toBe('myuser/cli');
      expect(result.cloneUrl).toBe('https://github.com/myuser/cli.git');
    });

    it('should not double-append .git if URL already has it', async () => {
      mockExecFile.mockResolvedValue({
        stdout: JSON.stringify({
          nameWithOwner: 'myuser/cli',
          url: 'https://github.com/myuser/cli.git',
        }),
        stderr: '',
      });

      const result = await service.forkRepository('shep-ai/cli');

      expect(result.cloneUrl).toBe('https://github.com/myuser/cli.git');
    });

    it('should throw GitHubForkError on auth failure', async () => {
      mockExecFile.mockRejectedValue(new Error('HTTP 403: not authorized'));

      await expect(service.forkRepository('shep-ai/cli')).rejects.toThrow(GitHubForkError);
      await expect(service.forkRepository('shep-ai/cli')).rejects.toThrow('Failed to fork');
    });

    it('should throw GitHubForkError on network error', async () => {
      mockExecFile.mockRejectedValue(new Error('network timeout'));

      await expect(service.forkRepository('shep-ai/cli')).rejects.toThrow(GitHubForkError);
    });

    it('should preserve error cause', async () => {
      const cause = new Error('original fork error');
      mockExecFile.mockRejectedValue(cause);

      try {
        await service.forkRepository('shep-ai/cli');
        expect.fail('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(GitHubForkError);
        expect((err as GitHubForkError).cause).toBe(cause);
      }
    });
  });
});
