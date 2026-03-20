/**
 * GitHub Issue Creator Service Implementation
 *
 * Implements IGitHubIssueService using the gh CLI for creating issues
 * on GitHub repositories. Wraps `gh issue create` with structured
 * error handling and result parsing.
 */

import { injectable, inject } from 'tsyringe';
import type { ExecFunction } from '../git/worktree.service.js';
import type {
  IGitHubIssueService,
  GitHubIssueCreateResult,
} from '../../../application/ports/output/services/github-issue-service.interface.js';
import {
  GitHubIssueError,
  GitHubIssueErrorCode,
} from '../../../application/ports/output/services/github-issue-service.interface.js';

@injectable()
export class GitHubIssueCreatorService implements IGitHubIssueService {
  constructor(@inject('ExecFunction') private readonly execFile: ExecFunction) {}

  async createIssue(
    repo: string,
    title: string,
    body: string,
    labels: string[]
  ): Promise<GitHubIssueCreateResult> {
    const args = ['issue', 'create', '--repo', repo, '--title', title, '--body', body];

    for (const label of labels) {
      args.push('--label', label);
    }

    try {
      const { stdout } = await this.execFile('gh', args);
      const url = stdout.trim();
      const number = this.parseIssueNumberFromUrl(url);

      return { url, number };
    } catch (error) {
      throw this.mapError(error);
    }
  }

  private parseIssueNumberFromUrl(url: string): number {
    const match = url.match(/\/issues\/(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  }

  private mapError(error: unknown): GitHubIssueError {
    const message = error instanceof Error ? error.message : String(error);
    const cause = error instanceof Error ? error : undefined;
    const errnoCode = (error as NodeJS.ErrnoException)?.code;

    if (errnoCode === 'ENOENT' || message.includes('ENOENT')) {
      return new GitHubIssueError(
        'GitHub CLI (gh) is not installed. Install it from https://cli.github.com/',
        GitHubIssueErrorCode.GH_NOT_FOUND,
        cause
      );
    }

    if (message.includes('auth') || message.includes('Authentication') || message.includes('403')) {
      return new GitHubIssueError(
        'GitHub CLI is not authenticated. Run `gh auth login` to sign in.',
        GitHubIssueErrorCode.AUTH_FAILURE,
        cause
      );
    }

    if (
      message.includes('network') ||
      message.includes('ECONNREFUSED') ||
      message.includes('ETIMEDOUT')
    ) {
      return new GitHubIssueError(
        `Network error creating issue: ${message}`,
        GitHubIssueErrorCode.NETWORK_ERROR,
        cause
      );
    }

    return new GitHubIssueError(
      `Failed to create issue on ${message}`,
      GitHubIssueErrorCode.CREATE_FAILED,
      cause
    );
  }
}
