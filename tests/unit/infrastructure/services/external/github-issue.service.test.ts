/**
 * GitHubIssueFetcher Unit Tests
 *
 * Tests for fetching GitHub issues via gh CLI subprocess.
 *
 * TDD Phase: RED
 */

import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GitHubIssueFetcher } from '@/infrastructure/services/external/github-issue.service.js';
import {
  IssueNotFoundError,
  IssueServiceUnavailableError,
} from '@/application/ports/output/external-issue-fetcher.interface.js';

describe('GitHubIssueFetcher', () => {
  let fetcher: GitHubIssueFetcher;
  let mockExecFile: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockExecFile = vi.fn();
    fetcher = new GitHubIssueFetcher(mockExecFile as any);
  });

  describe('fetchGitHubIssue()', () => {
    it('should fetch issue with owner/repo#number format', async () => {
      mockExecFile.mockResolvedValue({
        stdout: JSON.stringify({
          title: 'Fix login bug',
          body: 'Login fails when password contains special chars',
          labels: [{ name: 'bug' }, { name: 'auth' }],
          url: 'https://github.com/owner/repo/issues/42',
        }),
      });

      const issue = await fetcher.fetchGitHubIssue('owner/repo#42');

      expect(issue.title).toBe('Fix login bug');
      expect(issue.description).toBe('Login fails when password contains special chars');
      expect(issue.labels).toEqual(['bug', 'auth']);
      expect(issue.url).toBe('https://github.com/owner/repo/issues/42');
      expect(issue.source).toBe('github');
      expect(mockExecFile).toHaveBeenCalledWith(
        'gh',
        ['issue', 'view', '42', '--repo', 'owner/repo', '--json', 'title,body,labels,url'],
        expect.any(Object)
      );
    });

    it('should fetch issue with plain #number format (current repo)', async () => {
      mockExecFile.mockResolvedValue({
        stdout: JSON.stringify({
          title: 'Add feature X',
          body: 'Feature description',
          labels: [{ name: 'enhancement' }],
          url: 'https://github.com/org/project/issues/7',
        }),
      });

      const issue = await fetcher.fetchGitHubIssue('#7');

      expect(issue.title).toBe('Add feature X');
      expect(mockExecFile).toHaveBeenCalledWith(
        'gh',
        ['issue', 'view', '7', '--json', 'title,body,labels,url'],
        expect.any(Object)
      );
    });

    it('should fetch issue with plain number format', async () => {
      mockExecFile.mockResolvedValue({
        stdout: JSON.stringify({
          title: 'Issue 5',
          body: '',
          labels: [],
          url: 'https://github.com/org/project/issues/5',
        }),
      });

      const issue = await fetcher.fetchGitHubIssue('5');

      expect(issue.title).toBe('Issue 5');
      expect(issue.description).toBe('');
    });

    it('should throw IssueNotFoundError when issue does not exist', async () => {
      mockExecFile.mockRejectedValue(
        new Error('Could not resolve to an issue, pull request, or discussion')
      );

      await expect(fetcher.fetchGitHubIssue('#999')).rejects.toThrow(IssueNotFoundError);
    });

    it('should throw IssueServiceUnavailableError when gh CLI is not installed', async () => {
      const err = new Error('spawn gh ENOENT') as NodeJS.ErrnoException;
      err.code = 'ENOENT';
      mockExecFile.mockRejectedValue(err);

      await expect(fetcher.fetchGitHubIssue('#1')).rejects.toThrow(IssueServiceUnavailableError);
    });

    it('should handle issue with no labels', async () => {
      mockExecFile.mockResolvedValue({
        stdout: JSON.stringify({
          title: 'Bare issue',
          body: null,
          labels: [],
          url: 'https://github.com/o/r/issues/1',
        }),
      });

      const issue = await fetcher.fetchGitHubIssue('o/r#1');

      expect(issue.labels).toEqual([]);
      expect(issue.description).toBe('');
    });
  });
});
