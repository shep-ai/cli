/**
 * Git PR Service Interface
 *
 * Output port for git PR and merge operations.
 * Implementations manage PR creation, merging, and CI status checks.
 */

import type { PrStatus } from '../../../../domain/generated/output.js';

/**
 * Error codes for git PR operations.
 */
export enum GitPrErrorCode {
  MERGE_CONFLICT = 'MERGE_CONFLICT',
  AUTH_FAILURE = 'AUTH_FAILURE',
  GH_NOT_FOUND = 'GH_NOT_FOUND',
  NETWORK_ERROR = 'NETWORK_ERROR',
  CI_TIMEOUT = 'CI_TIMEOUT',
  BRANCH_NOT_FOUND = 'BRANCH_NOT_FOUND',
  GIT_ERROR = 'GIT_ERROR',
  MERGE_FAILED = 'MERGE_FAILED',
  PR_NOT_FOUND = 'PR_NOT_FOUND',
}

/**
 * Typed error for git PR operations.
 */
export class GitPrError extends Error {
  constructor(
    message: string,
    public readonly code: GitPrErrorCode,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'GitPrError';
  }
}

/**
 * CI check status values.
 */
export type CiStatus = 'success' | 'failure' | 'pending';

/**
 * Result of a CI status check.
 */
export interface CiStatusResult {
  /** Overall CI status */
  status: CiStatus;
  /** URL to the CI run (e.g., GitHub Actions run URL) */
  runUrl?: string;
  /** Excerpt from CI logs (e.g., failure output) */
  logExcerpt?: string;
}

/**
 * Summary of diff statistics between branches or commits.
 */
export interface DiffSummary {
  /** Number of files changed */
  filesChanged: number;
  /** Number of lines added */
  additions: number;
  /** Number of lines deleted */
  deletions: number;
  /** Number of commits in the diff */
  commitCount: number;
}

/**
 * Result of creating a pull request.
 */
export interface PrCreateResult {
  /** URL of the created PR */
  url: string;
  /** PR number */
  number: number;
}

/**
 * PR status information returned by batch status queries.
 */
export interface PrStatusInfo {
  /** PR number */
  number: number;
  /** Current PR state (Open, Merged, or Closed) */
  state: PrStatus;
  /** URL of the pull request */
  url: string;
}

/**
 * Merge strategy for pull requests.
 */
export type MergeStrategy = 'squash' | 'merge' | 'rebase';

/**
 * Service interface for git PR and merge operations.
 */
export interface IGitPrService {
  /**
   * Check if the repository has any configured git remotes.
   *
   * @param cwd - Working directory path
   * @returns True if at least one remote is configured
   */
  hasRemote(cwd: string): Promise<boolean>;

  /**
   * Detect the repository's default branch with robust fallback chain:
   * 1. Remote HEAD (git symbolic-ref refs/remotes/origin/HEAD)
   * 2. Local branches named main or master (in that order)
   * 3. Current branch (git symbolic-ref HEAD)
   *
   * @param cwd - Working directory path
   * @returns The default branch name (e.g. "main", "master", "develop")
   */
  getDefaultBranch(cwd: string): Promise<string>;

  /**
   * Check if the working directory has uncommitted changes.
   *
   * @param cwd - Working directory path
   * @returns True if there are uncommitted changes
   * @throws GitPrError with GIT_ERROR code on failure
   */
  hasUncommittedChanges(cwd: string): Promise<boolean>;

  /**
   * Stage all changes and create a commit.
   *
   * @param cwd - Working directory path
   * @param message - Commit message
   * @returns The commit SHA
   * @throws GitPrError with GIT_ERROR code on failure
   */
  commitAll(cwd: string, message: string): Promise<string>;

  /**
   * Push the current branch to the remote.
   *
   * @param cwd - Working directory path
   * @param branch - Branch name to push
   * @param setUpstream - Whether to set upstream tracking
   * @throws GitPrError with MERGE_CONFLICT or AUTH_FAILURE code
   */
  push(cwd: string, branch: string, setUpstream?: boolean): Promise<void>;

  /**
   * Create a pull request from a pr.yaml file.
   *
   * @param cwd - Working directory path
   * @param prYamlPath - Path to the pr.yaml file
   * @returns URL and number of the created PR
   * @throws GitPrError with GH_NOT_FOUND or AUTH_FAILURE code
   */
  createPr(cwd: string, prYamlPath: string): Promise<PrCreateResult>;

  /**
   * Merge a pull request.
   *
   * @param cwd - Working directory path
   * @param prNumber - PR number to merge
   * @param strategy - Merge strategy (squash, merge, rebase)
   * @throws GitPrError with MERGE_FAILED code
   */
  mergePr(cwd: string, prNumber: number, strategy?: MergeStrategy): Promise<void>;

  /**
   * Merge a source branch into a target branch using git merge.
   *
   * @param cwd - Working directory path
   * @param sourceBranch - Branch to merge from
   * @param targetBranch - Branch to merge into
   * @throws GitPrError with MERGE_CONFLICT code
   */
  mergeBranch(cwd: string, sourceBranch: string, targetBranch: string): Promise<void>;

  /**
   * Get the current CI status for the branch.
   *
   * @param cwd - Working directory path
   * @param branch - Branch to check CI for
   * @returns CI status result
   * @throws GitPrError with GH_NOT_FOUND or NETWORK_ERROR code
   */
  getCiStatus(cwd: string, branch: string): Promise<CiStatusResult>;

  /**
   * Watch CI until it completes or times out.
   *
   * @param cwd - Working directory path
   * @param branch - Branch to watch CI for
   * @param timeoutMs - Maximum time to wait in milliseconds
   * @returns CI status result when complete
   * @throws GitPrError with CI_TIMEOUT code on timeout
   */
  watchCi(cwd: string, branch: string, timeoutMs?: number): Promise<CiStatusResult>;

  /**
   * Delete a branch locally and optionally on the remote.
   *
   * @param cwd - Working directory path
   * @param branch - Branch to delete
   * @param deleteRemote - Whether to also delete the remote branch
   * @throws GitPrError with BRANCH_NOT_FOUND or GIT_ERROR code
   */
  deleteBranch(cwd: string, branch: string, deleteRemote?: boolean): Promise<void>;

  /**
   * Get diff summary statistics between the current branch and a base branch.
   *
   * @param cwd - Working directory path
   * @param baseBranch - Base branch to compare against
   * @returns Diff summary with file count, additions, deletions, and commit count
   * @throws GitPrError with GIT_ERROR code
   */
  getPrDiffSummary(cwd: string, baseBranch: string): Promise<DiffSummary>;

  /**
   * List PR statuses for all open and recently-updated PRs in a repository.
   *
   * @param cwd - Working directory path (repository root)
   * @returns Array of PR status info with number, state, and URL
   * @throws GitPrError with GH_NOT_FOUND, AUTH_FAILURE, or GIT_ERROR code
   */
  listPrStatuses(cwd: string): Promise<PrStatusInfo[]>;

  /**
   * Verify that a feature branch has been merged into a base branch.
   * Uses `git merge-base --is-ancestor` to check if featureBranch
   * is an ancestor of baseBranch (meaning all its commits are reachable).
   *
   * @param cwd - Working directory path
   * @param featureBranch - The branch that should have been merged
   * @param baseBranch - The branch that should contain the merge
   * @returns True if featureBranch is an ancestor of baseBranch
   */
  verifyMerge(cwd: string, featureBranch: string, baseBranch: string): Promise<boolean>;

  /**
   * Retrieve failure logs for a CI run via `gh run view --log-failed`.
   * Output is truncated to the first `logMaxChars` characters (head truncation).
   * A notice is appended when truncation occurs.
   *
   * @param runId - GitHub Actions run ID (numeric string)
   * @param branch - Branch name (informational, used in truncation notice)
   * @param logMaxChars - Maximum characters to return (default 50_000)
   * @returns Truncated failure log output
   * @throws GitPrError with GH_NOT_FOUND or GIT_ERROR code on failure
   */
  getFailureLogs(runId: string, branch: string, logMaxChars?: number): Promise<string>;
}
