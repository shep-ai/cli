/**
 * GitHubIssueFetcher.listIssues() Unit Tests
 *
 * Tests for batch-fetching GitHub issues via gh CLI subprocess.
 * Follows the same mock-execFile pattern as github-issue.service.test.ts.
 */

import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GitHubIssueFetcher } from '@/infrastructure/services/external/github-issue.service.js';
import { IssueServiceUnavailableError } from '@/application/ports/output/services/external-issue-fetcher.interface.js';

describe('GitHubIssueFetcher.listIssues()', () => {
  let fetcher: GitHubIssueFetcher;
  let mockExecFile: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockExecFile = vi.fn();
    fetcher = new GitHubIssueFetcher(mockExecFile as any);
  });

  it('should fetch issues with default options (no filters)', async () => {
    mockExecFile.mockResolvedValue({
      stdout: JSON.stringify([
        {
          number: 1,
          title: 'Fix login bug',
          body: 'Login fails with special chars',
          labels: [{ name: 'bug' }],
          url: 'https://github.com/owner/repo/issues/1',
        },
        {
          number: 2,
          title: 'Add dark mode',
          body: 'Support dark theme',
          labels: [{ name: 'enhancement' }, { name: 'ui' }],
          url: 'https://github.com/owner/repo/issues/2',
        },
      ]),
    });

    const issues = await fetcher.listIssues();

    expect(issues).toHaveLength(2);
    expect(issues[0]).toEqual({
      title: 'Fix login bug',
      description: 'Login fails with special chars',
      labels: ['bug'],
      url: 'https://github.com/owner/repo/issues/1',
      source: 'github',
      number: 1,
    });
    expect(issues[1]).toEqual({
      title: 'Add dark mode',
      description: 'Support dark theme',
      labels: ['enhancement', 'ui'],
      url: 'https://github.com/owner/repo/issues/2',
      source: 'github',
      number: 2,
    });
    expect(mockExecFile).toHaveBeenCalledWith(
      'gh',
      [
        'issue',
        'list',
        '--json',
        'number,title,body,labels,url',
        '--state',
        'open',
        '--limit',
        '100',
      ],
      expect.any(Object)
    );
  });

  it('should pass --label flags for each provided label', async () => {
    mockExecFile.mockResolvedValue({ stdout: JSON.stringify([]) });

    await fetcher.listIssues({ labels: ['bug', 'critical'] });

    expect(mockExecFile).toHaveBeenCalledWith(
      'gh',
      [
        'issue',
        'list',
        '--json',
        'number,title,body,labels,url',
        '--state',
        'open',
        '--limit',
        '100',
        '--label',
        'bug',
        '--label',
        'critical',
      ],
      expect.any(Object)
    );
  });

  it('should pass --repo flag when repo option is provided', async () => {
    mockExecFile.mockResolvedValue({ stdout: JSON.stringify([]) });

    await fetcher.listIssues({ repo: 'owner/repo' });

    expect(mockExecFile).toHaveBeenCalledWith(
      'gh',
      [
        'issue',
        'list',
        '--json',
        'number,title,body,labels,url',
        '--state',
        'open',
        '--limit',
        '100',
        '--repo',
        'owner/repo',
      ],
      expect.any(Object)
    );
  });

  it('should pass --limit flag with custom value', async () => {
    mockExecFile.mockResolvedValue({ stdout: JSON.stringify([]) });

    await fetcher.listIssues({ limit: 50 });

    expect(mockExecFile).toHaveBeenCalledWith(
      'gh',
      [
        'issue',
        'list',
        '--json',
        'number,title,body,labels,url',
        '--state',
        'open',
        '--limit',
        '50',
      ],
      expect.any(Object)
    );
  });

  it('should return empty array when no issues exist', async () => {
    mockExecFile.mockResolvedValue({ stdout: JSON.stringify([]) });

    const issues = await fetcher.listIssues();

    expect(issues).toEqual([]);
  });

  it('should throw IssueServiceUnavailableError when gh is not installed', async () => {
    const err = new Error('spawn gh ENOENT') as NodeJS.ErrnoException;
    err.code = 'ENOENT';
    mockExecFile.mockRejectedValue(err);

    await expect(fetcher.listIssues()).rejects.toThrow(IssueServiceUnavailableError);
  });

  it('should populate number field on returned ExternalIssue objects', async () => {
    mockExecFile.mockResolvedValue({
      stdout: JSON.stringify([
        {
          number: 42,
          title: 'Issue 42',
          body: 'Body',
          labels: [],
          url: 'https://github.com/o/r/issues/42',
        },
      ]),
    });

    const issues = await fetcher.listIssues();

    expect(issues[0].number).toBe(42);
  });

  it('should handle null body gracefully', async () => {
    mockExecFile.mockResolvedValue({
      stdout: JSON.stringify([
        {
          number: 10,
          title: 'No body issue',
          body: null,
          labels: [{ name: 'question' }],
          url: 'https://github.com/o/r/issues/10',
        },
      ]),
    });

    const issues = await fetcher.listIssues();

    expect(issues[0].description).toBe('');
  });

  it('should handle API errors with a descriptive message', async () => {
    mockExecFile.mockRejectedValue(new Error('HTTP 403: API rate limit exceeded'));

    await expect(fetcher.listIssues()).rejects.toThrow('Failed to list GitHub issues');
  });
});
