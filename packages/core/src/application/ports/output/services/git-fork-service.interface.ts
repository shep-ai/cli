/**
 * Git Fork Service Interface
 *
 * Output port for GitHub fork operations.
 * Manages forking repos, pushing to forks, and creating upstream PRs.
 */

export enum GitForkErrorCode {
  AUTH_FAILURE = 'AUTH_FAILURE',
  FORK_FAILED = 'FORK_FAILED',
  PUSH_FAILED = 'PUSH_FAILED',
  UPSTREAM_PR_FAILED = 'UPSTREAM_PR_FAILED',
  UPSTREAM_PR_NOT_FOUND = 'UPSTREAM_PR_NOT_FOUND',
}

export class GitForkError extends Error {
  constructor(
    message: string,
    public readonly code: GitForkErrorCode,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'GitForkError';
  }
}

export interface UpstreamPrStatus {
  state: 'open' | 'merged' | 'closed';
  url: string;
  number: number;
}

export interface IGitForkService {
  forkRepository(cwd: string): Promise<void>;
  pushToFork(cwd: string, branch: string): Promise<void>;
  createUpstreamPr(
    cwd: string,
    title: string,
    body: string,
    head: string,
    base: string
  ): Promise<{ url: string; number: number }>;
  getUpstreamPrStatus(upstreamRepo: string, prNumber: number): Promise<UpstreamPrStatus>;
}
