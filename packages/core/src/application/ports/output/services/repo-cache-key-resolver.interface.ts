/**
 * Repo Cache Key Resolver Interface
 *
 * Output port for resolving a stable cache key for a repository.
 * The cache key identifies a repository uniquely across worktrees and clones.
 *
 * Resolution strategy (three-level fallback):
 * 1. Git remote origin URL (canonical repo identifier, shared across worktrees/clones)
 * 2. Root repo absolute path (via git rev-parse --git-common-dir, for repos without a remote)
 * 3. Provided working directory path (fallback for non-git directories)
 */

/**
 * Port interface for resolving repository cache keys.
 *
 * Implementations must:
 * - Attempt git remote URL resolution first (stable across worktrees)
 * - Fall back to root repo absolute path for repos without remotes
 * - Fall back to the provided cwd for non-git directories
 * - Be injectable and mockable for testing
 */
export interface IRepoCacheKeyResolver {
  /**
   * Resolve the cache key for a repository.
   *
   * @param cwd - Working directory path within the repository
   * @returns The resolved cache key (remote URL, root repo path, or cwd)
   */
  resolve(cwd: string): Promise<string>;
}
