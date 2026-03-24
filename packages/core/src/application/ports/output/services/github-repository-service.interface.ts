/**
 * GitHub Repository Service Interface
 *
 * Output port for GitHub repository operations via the gh CLI.
 * Implementations manage authentication checks, repository cloning,
 * user repository listing, and GitHub URL parsing.
 */

// ---------------------------------------------------------------------------
// Error classes
// ---------------------------------------------------------------------------

/**
 * Thrown when the GitHub CLI is not authenticated.
 */
export class GitHubAuthError extends Error {
  constructor(message: string, cause?: Error) {
    super(message);
    this.name = 'GitHubAuthError';
    Object.setPrototypeOf(this, new.target.prototype);
    if (cause) this.cause = cause;
  }
}

/**
 * Thrown when a `gh repo clone` operation fails.
 */
export class GitHubCloneError extends Error {
  constructor(message: string, cause?: Error) {
    super(message);
    this.name = 'GitHubCloneError';
    Object.setPrototypeOf(this, new.target.prototype);
    if (cause) this.cause = cause;
  }
}

/**
 * Thrown when a GitHub URL cannot be parsed into owner/repo.
 */
export class GitHubUrlParseError extends Error {
  constructor(message: string, cause?: Error) {
    super(message);
    this.name = 'GitHubUrlParseError';
    Object.setPrototypeOf(this, new.target.prototype);
    if (cause) this.cause = cause;
  }
}

/**
 * Thrown when listing the user's GitHub repositories fails.
 */
export class GitHubRepoListError extends Error {
  constructor(message: string, cause?: Error) {
    super(message);
    this.name = 'GitHubRepoListError';
    Object.setPrototypeOf(this, new.target.prototype);
    if (cause) this.cause = cause;
  }
}

/**
 * Thrown when a `gh repo fork` operation fails.
 */
export class GitHubForkError extends Error {
  constructor(message: string, cause?: Error) {
    super(message);
    this.name = 'GitHubForkError';
    Object.setPrototypeOf(this, new.target.prototype);
    if (cause) this.cause = cause;
  }
}

/**
 * Thrown when checking the viewer's permission on a repository fails.
 */
export class GitHubPermissionError extends Error {
  constructor(message: string, cause?: Error) {
    super(message);
    this.name = 'GitHubPermissionError';
    Object.setPrototypeOf(this, new.target.prototype);
    if (cause) this.cause = cause;
  }
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * A GitHub repository as returned by `gh repo list --json`.
 */
export interface GitHubRepo {
  /** Repository name (e.g. "my-project") */
  name: string;
  /** Full owner/repo identifier (e.g. "octocat/my-project") */
  nameWithOwner: string;
  /** Repository description (may be empty string) */
  description: string;
  /** Whether the repository is private */
  isPrivate: boolean;
  /** ISO 8601 timestamp of the most recent push */
  pushedAt: string;
}

/**
 * Options for listing user repositories.
 */
export interface ListUserRepositoriesOptions {
  /** Maximum number of repos to return (default: 30) */
  limit?: number;
  /** Filter repos by name substring */
  search?: string;
}

/**
 * Options for cloning a repository.
 */
export interface CloneOptions {
  /** Callback invoked with stderr chunks during clone for progress display */
  onProgress?: (data: string) => void;
}

/**
 * Result of forking a GitHub repository.
 */
export interface ForkResult {
  /** Full owner/repo identifier of the fork (e.g. "username/cli") */
  nameWithOwner: string;
  /** Clone URL for the fork (e.g. "https://github.com/username/cli.git") */
  cloneUrl: string;
}

/**
 * Result of parsing a GitHub URL.
 */
export interface ParsedGitHubUrl {
  /** Repository owner (e.g. "octocat") */
  owner: string;
  /** Repository name (e.g. "my-project") */
  repo: string;
  /** Combined owner/repo (e.g. "octocat/my-project") */
  nameWithOwner: string;
}

// ---------------------------------------------------------------------------
// Service interface
// ---------------------------------------------------------------------------

/**
 * Output port for GitHub repository operations.
 *
 * Implementations use the `gh` CLI for all GitHub interactions.
 */
export interface IGitHubRepositoryService {
  /**
   * Verify that the GitHub CLI is authenticated.
   *
   * @throws {GitHubAuthError} if `gh auth status` indicates the user is not logged in
   */
  checkAuth(): Promise<void>;

  /**
   * Clone a GitHub repository to a local destination directory.
   *
   * @param nameWithOwner - Full owner/repo identifier (e.g. "octocat/my-project")
   * @param destination - Absolute path to clone into
   * @param options - Optional clone configuration (e.g. progress callback)
   * @throws {GitHubCloneError} if the clone subprocess fails
   */
  cloneRepository(
    nameWithOwner: string,
    destination: string,
    options?: CloneOptions
  ): Promise<void>;

  /**
   * List the authenticated user's GitHub repositories.
   *
   * @param options - Optional filtering and pagination
   * @returns Array of GitHub repositories sorted by most recently pushed
   * @throws {GitHubRepoListError} if the list operation fails
   */
  listUserRepositories(options?: ListUserRepositoriesOptions): Promise<GitHubRepo[]>;

  /**
   * Parse a GitHub URL or shorthand into its owner/repo components.
   *
   * Supported formats:
   * - `https://github.com/owner/repo`
   * - `https://github.com/owner/repo.git`
   * - `git@github.com:owner/repo.git`
   * - `owner/repo` (shorthand)
   *
   * @param url - The GitHub URL or shorthand to parse
   * @returns Parsed owner, repo, and nameWithOwner
   * @throws {GitHubUrlParseError} if the URL does not match any supported format
   */
  parseGitHubUrl(url: string): ParsedGitHubUrl;

  /**
   * Check whether the authenticated user has push access to a repository.
   *
   * Uses `gh api repos/{owner}/{repo} --jq '.permissions.push'` to detect
   * access level. Returns false as the safe fallback on any error (network,
   * rate limit, API change) per NFR-9.
   *
   * @param repoNameWithOwner - Full owner/repo identifier (e.g. "shep-ai/cli")
   * @returns True if the user has push access, false otherwise (including on errors)
   */
  checkPushAccess(repoNameWithOwner: string): Promise<boolean>;

  /**
   * Fork a GitHub repository into the authenticated user's account.
   *
   * Uses `gh repo fork` which is idempotent — if the user already has a fork,
   * it detects the existing fork and returns it rather than failing.
   *
   * @param repoNameWithOwner - Full owner/repo identifier (e.g. "shep-ai/cli")
   * @returns The fork's nameWithOwner and clone URL
   * @throws {GitHubForkError} if the fork operation fails
   */
  forkRepository(repoNameWithOwner: string): Promise<ForkResult>;

  /**
   * Get the authenticated user's permission level on a GitHub repository.
   *
   * Uses `gh repo view --json viewerPermission` with the given repo path
   * as the working directory.
   *
   * @param repoPath - Absolute path to a local clone of the repository
   * @returns The viewer's permission level: "ADMIN", "MAINTAIN", "WRITE", "TRIAGE", or "READ"
   * @throws {GitHubPermissionError} if the permission check fails (e.g. gh not installed, not authenticated)
   */
  getViewerPermission(repoPath: string): Promise<string>;
}
