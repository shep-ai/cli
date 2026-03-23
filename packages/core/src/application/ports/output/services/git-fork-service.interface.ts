/**
 * Git Fork Service Interface
 *
 * Output port for GitHub fork and upstream PR operations.
 * Used when forkAndPr=true to fork a repo, push to the fork,
 * and create a PR to the upstream repository.
 */

import type { PrStatus } from '../../../../domain/generated/output.js';

/**
 * Error codes for git fork operations.
 */
export enum GitForkErrorCode {
  AUTH_FAILURE = 'AUTH_FAILURE',
  FORK_FAILED = 'FORK_FAILED',
  PUSH_FAILED = 'PUSH_FAILED',
  PR_CREATE_FAILED = 'PR_CREATE_FAILED',
  PR_STATUS_FAILED = 'PR_STATUS_FAILED',
}

/**
 * Typed error for git fork operations.
 */
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

/**
 * Result of creating an upstream PR.
 */
export interface UpstreamPrResult {
  /** URL of the upstream PR */
  url: string;
  /** PR number on the upstream repo */
  number: number;
}

/**
 * Service interface for GitHub fork and upstream PR operations.
 */
export interface IGitForkService {
  /**
   * Fork the repository to the authenticated user's GitHub account.
   * Remaps remotes: fork becomes `origin`, original becomes `upstream`.
   * Idempotent — if already forked, returns the existing fork.
   *
   * @param cwd - Working directory path (the worktree)
   * @throws GitForkError with AUTH_FAILURE or FORK_FAILED code
   */
  forkRepository(cwd: string): Promise<void>;

  /**
   * Push the feature branch to the fork (origin after remapping).
   *
   * @param cwd - Working directory path
   * @param branch - Branch name to push
   * @throws GitForkError with PUSH_FAILED code
   */
  pushToFork(cwd: string, branch: string): Promise<void>;

  /**
   * Create a PR from the fork to the upstream repository.
   *
   * @param cwd - Working directory path
   * @param title - PR title
   * @param body - PR body/description
   * @param head - Head branch (on the fork)
   * @param base - Base branch on the upstream repo
   * @returns URL and number of the created upstream PR
   * @throws GitForkError with PR_CREATE_FAILED code
   */
  createUpstreamPr(
    cwd: string,
    title: string,
    body: string,
    head: string,
    base: string
  ): Promise<UpstreamPrResult>;

  /**
   * Get the status of an upstream PR.
   *
   * @param upstreamRepo - Upstream repo in owner/name format
   * @param prNumber - PR number on the upstream repo
   * @returns The PR status (Open, Merged, or Closed)
   * @throws GitForkError with PR_STATUS_FAILED code
   */
  getUpstreamPrStatus(upstreamRepo: string, prNumber: number): Promise<PrStatus>;
}
