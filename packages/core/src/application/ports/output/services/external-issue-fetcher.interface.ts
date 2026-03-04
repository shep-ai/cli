/**
 * External Issue Fetcher Port Interface
 *
 * Output port for fetching issues/tickets from external systems (GitHub, Jira).
 * Returns a normalized ExternalIssue that can be appended to feature context.
 *
 * Following Clean Architecture:
 * - Application layer depends on this interface
 * - Infrastructure layer provides concrete implementations
 */

/**
 * Normalized issue representation from any external source.
 */
export interface ExternalIssue {
  title: string;
  description: string;
  labels: string[];
  url: string;
  source: 'github' | 'jira';
  /** Issue number (e.g., GitHub issue #42). Optional for sources like Jira that use string keys. */
  number?: number;
}

/**
 * Options for listing issues from an external source.
 */
export interface ListIssuesOptions {
  /** Target repository (e.g., "owner/repo"). Uses the current repo if omitted. */
  repo?: string;
  /** Filter issues by labels. */
  labels?: string[];
  /** Maximum number of issues to fetch. Defaults to 100. */
  limit?: number;
}

/**
 * Service interface for fetching issues from external systems.
 */
export interface IExternalIssueFetcher {
  /**
   * Fetch a GitHub issue by reference.
   * Supports formats: owner/repo#123 or #123 (uses current repo).
   *
   * @param ref - GitHub issue reference (e.g., "owner/repo#42" or "#42")
   * @returns Normalized external issue
   * @throws IssueNotFoundError if issue doesn't exist
   * @throws IssueServiceUnavailableError if gh CLI is not installed
   */
  fetchGitHubIssue(ref: string): Promise<ExternalIssue>;

  /**
   * Fetch a Jira ticket by key.
   *
   * @param key - Jira ticket key (e.g., "PROJ-123")
   * @returns Normalized external issue
   * @throws IssueNotFoundError if ticket doesn't exist
   * @throws IssueAuthenticationError if credentials are invalid
   */
  fetchJiraTicket(key: string): Promise<ExternalIssue>;

  /**
   * List open issues from the external source.
   *
   * @param options - Optional filters for repo, labels, and limit
   * @returns Array of normalized external issues
   * @throws IssueServiceUnavailableError if the external service CLI is not installed
   * @throws IssueAuthenticationError if credentials are invalid
   */
  listIssues(options?: ListIssuesOptions): Promise<ExternalIssue[]>;
}

/**
 * Base error for issue fetcher failures.
 */
export class IssueFetcherError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'IssueFetcherError';
  }
}

/**
 * Thrown when the requested issue/ticket is not found.
 */
export class IssueNotFoundError extends IssueFetcherError {
  constructor(message: string) {
    super(message);
    this.name = 'IssueNotFoundError';
  }
}

/**
 * Thrown when authentication to the external service fails.
 */
export class IssueAuthenticationError extends IssueFetcherError {
  constructor(message: string) {
    super(message);
    this.name = 'IssueAuthenticationError';
  }
}

/**
 * Thrown when the external service is unavailable (e.g., gh CLI not installed).
 */
export class IssueServiceUnavailableError extends IssueFetcherError {
  constructor(message: string) {
    super(message);
    this.name = 'IssueServiceUnavailableError';
  }
}
