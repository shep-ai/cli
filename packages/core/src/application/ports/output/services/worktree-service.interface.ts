/**
 * Worktree Service Interface
 *
 * Output port for git worktree operations.
 * Implementations manage git worktree creation, removal, and listing.
 */

/**
 * Information about a git worktree.
 */
export interface WorktreeInfo {
  /** Absolute path to the worktree directory */
  path: string;
  /** HEAD commit hash */
  head: string;
  /** Branch name (empty for detached HEAD) */
  branch: string;
  /** Whether this is the main worktree */
  isMain: boolean;
}

/**
 * Error codes for worktree operations.
 */
export enum WorktreeErrorCode {
  ALREADY_EXISTS = 'ALREADY_EXISTS',
  BRANCH_IN_USE = 'BRANCH_IN_USE',
  NOT_FOUND = 'NOT_FOUND',
  DIRTY_WORKTREE = 'DIRTY_WORKTREE',
  GIT_ERROR = 'GIT_ERROR',
}

/**
 * Typed error for worktree operations.
 */
export class WorktreeError extends Error {
  constructor(
    message: string,
    public readonly code: WorktreeErrorCode,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'WorktreeError';
  }
}

/**
 * Service interface for git worktree management.
 */
export interface IWorktreeService {
  /**
   * Create a new worktree with a new branch.
   *
   * @param repoPath - Path to the git repository
   * @param branch - Branch name to create
   * @param worktreePath - Path for the new worktree directory
   * @returns Information about the created worktree
   * @throws WorktreeError with appropriate code
   */
  create(repoPath: string, branch: string, worktreePath: string): Promise<WorktreeInfo>;

  /**
   * Remove an existing worktree.
   *
   * @param worktreePath - Path to the worktree to remove
   * @throws WorktreeError if worktree not found or has uncommitted changes
   */
  remove(worktreePath: string): Promise<void>;

  /**
   * List all worktrees in a repository.
   *
   * @param repoPath - Path to the git repository
   * @returns Array of worktree information
   */
  list(repoPath: string): Promise<WorktreeInfo[]>;

  /**
   * Check if a worktree for a branch already exists.
   *
   * @param repoPath - Path to the git repository
   * @param branch - Branch name to check
   * @returns True if a worktree for this branch exists
   */
  exists(repoPath: string, branch: string): Promise<boolean>;

  /**
   * Check if a git branch exists in the repository.
   *
   * @param repoPath - Path to the git repository
   * @param branch - Branch name to check
   * @returns True if the branch exists
   */
  branchExists(repoPath: string, branch: string): Promise<boolean>;

  /**
   * Get the conventional worktree path for a branch.
   *
   * @param repoPath - Path to the git repository
   * @param branch - Branch name
   * @returns Computed worktree path (e.g., /repo/.worktrees/branch-name)
   */
  getWorktreePath(repoPath: string, branch: string): string;
}
