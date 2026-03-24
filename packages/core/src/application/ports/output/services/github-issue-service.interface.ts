/**
 * GitHub Issue Service Interface
 *
 * Output port for creating GitHub issues via the gh CLI.
 * Implementations wrap `gh issue create` for issue creation on
 * any GitHub repository. Separate from IExternalIssueFetcher which
 * is a read-only fetcher — this service handles write operations.
 */

// ---------------------------------------------------------------------------
// Error types
// ---------------------------------------------------------------------------

/**
 * Error codes for GitHub issue creation operations.
 */
export enum GitHubIssueErrorCode {
  /** The target repository was not found or the user lacks access */
  GH_NOT_FOUND = 'GH_NOT_FOUND',
  /** GitHub CLI authentication failure */
  AUTH_FAILURE = 'AUTH_FAILURE',
  /** Network connectivity error during API call */
  NETWORK_ERROR = 'NETWORK_ERROR',
  /** Issue creation failed for an unspecified reason */
  CREATE_FAILED = 'CREATE_FAILED',
}

/**
 * Typed error for GitHub issue creation operations.
 */
export class GitHubIssueError extends Error {
  constructor(
    message: string,
    public readonly code: GitHubIssueErrorCode,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'GitHubIssueError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Result of creating a GitHub issue.
 */
export interface GitHubIssueCreateResult {
  /** URL of the created issue (e.g. "https://github.com/owner/repo/issues/42") */
  url: string;
  /** Issue number */
  number: number;
}

// ---------------------------------------------------------------------------
// Service interface
// ---------------------------------------------------------------------------

/**
 * Output port for GitHub issue creation.
 *
 * Implementations use the `gh` CLI for all GitHub interactions.
 */
export interface IGitHubIssueService {
  /**
   * Create a new issue on a GitHub repository.
   *
   * @param repo - Full owner/repo identifier (e.g. "shep-ai/cli")
   * @param title - Issue title
   * @param body - Issue body (Markdown)
   * @param labels - Labels to apply to the issue (e.g. ["bug", "shep-doctor"])
   * @returns The created issue's URL and number
   * @throws {GitHubIssueError} with appropriate error code on failure
   */
  createIssue(
    repo: string,
    title: string,
    body: string,
    labels: string[]
  ): Promise<GitHubIssueCreateResult>;
}
