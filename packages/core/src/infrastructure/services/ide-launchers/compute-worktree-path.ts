/**
 * Compute Worktree Path
 *
 * Pure utility that computes the filesystem path for a feature's git worktree
 * given a repository path and branch name.
 *
 * Path format: ~/.shep/repos/<sha256-hash-prefix>/wt/<branch-slug>
 */

import { createHash } from 'node:crypto';
import { homedir } from 'node:os';
import { join } from 'node:path';

const SHEP_HOME_DIR = join(homedir(), '.shep');

/**
 * Compute the worktree path for a given repository and branch.
 *
 * @param repoPath - Absolute path to the repository
 * @param branch - Git branch name (slashes are replaced with hyphens)
 * @returns Absolute path to the worktree directory under ~/.shep/repos/
 */
export function computeWorktreePath(repoPath: string, branch: string): string {
  const repoHash = createHash('sha256').update(repoPath).digest('hex').slice(0, 16);
  const slug = branch.replace(/\//g, '-');
  return join(SHEP_HOME_DIR, 'repos', repoHash, 'wt', slug);
}
