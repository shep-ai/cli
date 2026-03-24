/**
 * IGitHubIssueService Interface Tests
 *
 * Verifies the type shape compiles correctly and that mocks implementing
 * the interface work as expected. Also validates error class behavior.
 */

import { describe, it, expect, vi } from 'vitest';
import type {
  IGitHubIssueService,
  GitHubIssueCreateResult,
} from '@/application/ports/output/services/github-issue-service.interface.js';
import {
  GitHubIssueError,
  GitHubIssueErrorCode,
} from '@/application/ports/output/services/github-issue-service.interface.js';

describe('IGitHubIssueService interface', () => {
  // -------------------------------------------------------------------------
  // Interface shape
  // -------------------------------------------------------------------------

  it('should allow creating a mock that implements IGitHubIssueService', async () => {
    const result: GitHubIssueCreateResult = {
      url: 'https://github.com/shep-ai/cli/issues/42',
      number: 42,
    };

    const mock: IGitHubIssueService = {
      createIssue: vi.fn().mockResolvedValue(result),
    };

    const actual = await mock.createIssue(
      'shep-ai/cli',
      '[shep doctor] Agent crashed during planning',
      'The agent failed with error...',
      ['bug', 'shep-doctor']
    );

    expect(actual).toEqual(result);
    expect(actual.url).toBe('https://github.com/shep-ai/cli/issues/42');
    expect(actual.number).toBe(42);
    expect(mock.createIssue).toHaveBeenCalledWith(
      'shep-ai/cli',
      '[shep doctor] Agent crashed during planning',
      'The agent failed with error...',
      ['bug', 'shep-doctor']
    );
  });

  // -------------------------------------------------------------------------
  // GitHubIssueCreateResult DTO
  // -------------------------------------------------------------------------

  it('should have url and number fields on GitHubIssueCreateResult', () => {
    const result: GitHubIssueCreateResult = {
      url: 'https://github.com/owner/repo/issues/1',
      number: 1,
    };

    expect(result.url).toBe('https://github.com/owner/repo/issues/1');
    expect(result.number).toBe(1);
  });

  // -------------------------------------------------------------------------
  // GitHubIssueErrorCode enum
  // -------------------------------------------------------------------------

  it('should define all expected error codes', () => {
    expect(GitHubIssueErrorCode.GH_NOT_FOUND).toBe('GH_NOT_FOUND');
    expect(GitHubIssueErrorCode.AUTH_FAILURE).toBe('AUTH_FAILURE');
    expect(GitHubIssueErrorCode.NETWORK_ERROR).toBe('NETWORK_ERROR');
    expect(GitHubIssueErrorCode.CREATE_FAILED).toBe('CREATE_FAILED');
  });

  // -------------------------------------------------------------------------
  // GitHubIssueError class
  // -------------------------------------------------------------------------

  it('should create GitHubIssueError with message and code', () => {
    const error = new GitHubIssueError('Repository not found', GitHubIssueErrorCode.GH_NOT_FOUND);

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(GitHubIssueError);
    expect(error.message).toBe('Repository not found');
    expect(error.code).toBe(GitHubIssueErrorCode.GH_NOT_FOUND);
    expect(error.name).toBe('GitHubIssueError');
    expect(error.cause).toBeUndefined();
  });

  it('should create GitHubIssueError with cause', () => {
    const cause = new Error('network timeout');
    const error = new GitHubIssueError(
      'Failed to create issue',
      GitHubIssueErrorCode.NETWORK_ERROR,
      cause
    );

    expect(error.cause).toBe(cause);
    expect(error.code).toBe(GitHubIssueErrorCode.NETWORK_ERROR);
  });

  it('should be catchable as instanceof GitHubIssueError', () => {
    const error = new GitHubIssueError('Auth failed', GitHubIssueErrorCode.AUTH_FAILURE);

    expect(() => {
      throw error;
    }).toThrow(GitHubIssueError);
  });

  it('should have correct prototype chain for instanceof checks', () => {
    const error = new GitHubIssueError('test', GitHubIssueErrorCode.CREATE_FAILED);

    // Object.setPrototypeOf ensures correct prototype chain
    expect(error instanceof GitHubIssueError).toBe(true);
    expect(error instanceof Error).toBe(true);
  });

  // -------------------------------------------------------------------------
  // Mock rejection with typed error
  // -------------------------------------------------------------------------

  it('should allow mock to reject with GitHubIssueError', async () => {
    const mock: IGitHubIssueService = {
      createIssue: vi
        .fn()
        .mockRejectedValue(
          new GitHubIssueError('Issue creation failed', GitHubIssueErrorCode.CREATE_FAILED)
        ),
    };

    await expect(mock.createIssue('shep-ai/cli', 'title', 'body', ['bug'])).rejects.toThrow(
      GitHubIssueError
    );
  });
});
