/**
 * GitHubIssueCreatorService Unit Tests
 *
 * Tests for creating GitHub issues via gh CLI subprocess.
 */

import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { GitHubIssueCreatorService } from '@/infrastructure/services/external/github-issue-creator.service.js';
import {
  GitHubIssueError,
  GitHubIssueErrorCode,
} from '@/application/ports/output/services/github-issue-service.interface.js';

describe('GitHubIssueCreatorService', () => {
  let service: GitHubIssueCreatorService;
  let mockExecFile: Mock;

  beforeEach(() => {
    mockExecFile = vi.fn();
    service = new GitHubIssueCreatorService(mockExecFile as any);
  });

  // ---------------------------------------------------------------------------
  // createIssue — success
  // ---------------------------------------------------------------------------

  describe('createIssue() — success', () => {
    it('should call gh issue create with correct flags and return URL + number', async () => {
      mockExecFile.mockResolvedValue({
        stdout: 'https://github.com/shep-ai/cli/issues/42\n',
        stderr: '',
      });

      const result = await service.createIssue(
        'shep-ai/cli',
        '[shep doctor] Agent crashed during planning',
        '## Problem\n\nAgent failed with error...',
        ['bug', 'shep-doctor']
      );

      expect(result.url).toBe('https://github.com/shep-ai/cli/issues/42');
      expect(result.number).toBe(42);
      expect(mockExecFile).toHaveBeenCalledWith('gh', [
        'issue',
        'create',
        '--repo',
        'shep-ai/cli',
        '--title',
        '[shep doctor] Agent crashed during planning',
        '--body',
        '## Problem\n\nAgent failed with error...',
        '--label',
        'bug',
        '--label',
        'shep-doctor',
      ]);
    });

    it('should handle issue URL without trailing newline', async () => {
      mockExecFile.mockResolvedValue({
        stdout: 'https://github.com/shep-ai/cli/issues/123',
        stderr: '',
      });

      const result = await service.createIssue('shep-ai/cli', 'Title', 'Body', []);

      expect(result.url).toBe('https://github.com/shep-ai/cli/issues/123');
      expect(result.number).toBe(123);
    });

    it('should create issue with no labels', async () => {
      mockExecFile.mockResolvedValue({
        stdout: 'https://github.com/shep-ai/cli/issues/7\n',
        stderr: '',
      });

      const result = await service.createIssue('shep-ai/cli', 'Title', 'Body', []);

      expect(result.number).toBe(7);
      expect(mockExecFile).toHaveBeenCalledWith('gh', [
        'issue',
        'create',
        '--repo',
        'shep-ai/cli',
        '--title',
        'Title',
        '--body',
        'Body',
      ]);
    });

    it('should return number 0 when URL cannot be parsed', async () => {
      mockExecFile.mockResolvedValue({
        stdout: 'some unexpected output\n',
        stderr: '',
      });

      const result = await service.createIssue('shep-ai/cli', 'Title', 'Body', []);

      expect(result.url).toBe('some unexpected output');
      expect(result.number).toBe(0);
    });
  });

  // ---------------------------------------------------------------------------
  // createIssue — error handling
  // ---------------------------------------------------------------------------

  describe('createIssue() — error handling', () => {
    it('should throw GH_NOT_FOUND when gh CLI is not installed', async () => {
      const err = new Error('spawn gh ENOENT') as NodeJS.ErrnoException;
      err.code = 'ENOENT';
      mockExecFile.mockRejectedValue(err);

      await expect(service.createIssue('shep-ai/cli', 'Title', 'Body', [])).rejects.toMatchObject({
        code: GitHubIssueErrorCode.GH_NOT_FOUND,
      });

      await expect(service.createIssue('shep-ai/cli', 'Title', 'Body', [])).rejects.toThrow(
        GitHubIssueError
      );
    });

    it('should throw AUTH_FAILURE when gh is not authenticated', async () => {
      mockExecFile.mockRejectedValue(new Error('Authentication required'));

      await expect(service.createIssue('shep-ai/cli', 'Title', 'Body', [])).rejects.toMatchObject({
        code: GitHubIssueErrorCode.AUTH_FAILURE,
      });
    });

    it('should throw AUTH_FAILURE on 403 errors', async () => {
      mockExecFile.mockRejectedValue(new Error('HTTP 403: Forbidden'));

      await expect(service.createIssue('shep-ai/cli', 'Title', 'Body', [])).rejects.toMatchObject({
        code: GitHubIssueErrorCode.AUTH_FAILURE,
      });
    });

    it('should throw NETWORK_ERROR on connection failures', async () => {
      mockExecFile.mockRejectedValue(new Error('network error: ECONNREFUSED'));

      await expect(service.createIssue('shep-ai/cli', 'Title', 'Body', [])).rejects.toMatchObject({
        code: GitHubIssueErrorCode.NETWORK_ERROR,
      });
    });

    it('should throw NETWORK_ERROR on timeout', async () => {
      mockExecFile.mockRejectedValue(new Error('ETIMEDOUT'));

      await expect(service.createIssue('shep-ai/cli', 'Title', 'Body', [])).rejects.toMatchObject({
        code: GitHubIssueErrorCode.NETWORK_ERROR,
      });
    });

    it('should throw CREATE_FAILED for unknown errors', async () => {
      mockExecFile.mockRejectedValue(new Error('something unexpected happened'));

      await expect(service.createIssue('shep-ai/cli', 'Title', 'Body', [])).rejects.toMatchObject({
        code: GitHubIssueErrorCode.CREATE_FAILED,
      });
    });

    it('should preserve cause on error', async () => {
      const cause = new Error('original error');
      mockExecFile.mockRejectedValue(cause);

      try {
        await service.createIssue('shep-ai/cli', 'Title', 'Body', []);
        expect.fail('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(GitHubIssueError);
        expect((err as GitHubIssueError).cause).toBe(cause);
      }
    });
  });
});
