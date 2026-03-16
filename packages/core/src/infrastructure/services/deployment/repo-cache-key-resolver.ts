/**
 * Repo Cache Key Resolver
 *
 * Resolves a stable cache key for a repository using a three-level fallback:
 * 1. Git remote origin URL (shared across worktrees and clones)
 * 2. Root repo absolute path (via git rev-parse --git-common-dir)
 * 3. Provided working directory path (for non-git directories)
 *
 * Uses the injected ExecFunction (same DI token used by GitPrService/WorktreeService)
 * to run git commands, making it mockable for tests.
 */

import { resolve } from 'node:path';
import { injectable, inject } from 'tsyringe';
import type { IRepoCacheKeyResolver } from '../../../application/ports/output/services/repo-cache-key-resolver.interface.js';

type ExecFunction = (
  file: string,
  args: string[],
  options?: object
) => Promise<{ stdout: string | Buffer }>;

@injectable()
export class RepoCacheKeyResolver implements IRepoCacheKeyResolver {
  constructor(@inject('ExecFunction') private readonly exec: ExecFunction) {}

  async resolve(cwd: string): Promise<string> {
    // Level 1: Try git remote URL
    const remoteUrl = await this.getRemoteUrl(cwd);
    if (remoteUrl) {
      return remoteUrl;
    }

    // Level 2: Try root repo path via git-common-dir
    const rootPath = await this.getRootRepoPath(cwd);
    if (rootPath) {
      return rootPath;
    }

    // Level 3: Fallback to provided working directory
    return cwd;
  }

  private async getRemoteUrl(cwd: string): Promise<string | null> {
    try {
      const { stdout } = await this.exec('git', ['remote', 'get-url', 'origin'], { cwd });
      const url = String(stdout).trim();
      return url || null;
    } catch {
      return null;
    }
  }

  private async getRootRepoPath(cwd: string): Promise<string | null> {
    try {
      const { stdout } = await this.exec('git', ['rev-parse', '--git-common-dir'], { cwd });
      const gitDir = String(stdout).trim();
      if (!gitDir) return null;

      // git-common-dir returns the .git directory (or bare repo root).
      // Resolve to absolute path relative to cwd, then go up one level
      // to get the repo root (parent of .git).
      const absoluteGitDir = resolve(cwd, gitDir);

      // If it ends with .git, the repo root is one level up
      if (absoluteGitDir.endsWith('.git')) {
        return resolve(absoluteGitDir, '..');
      }

      // For bare repos or unusual layouts, return as-is
      return absoluteGitDir;
    } catch {
      return null;
    }
  }
}
