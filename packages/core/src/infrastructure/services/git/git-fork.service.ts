/**
 * Git Fork Service Implementation
 *
 * Manages GitHub fork operations: forking repos, pushing to forks,
 * and creating/querying upstream PRs.
 * Uses constructor dependency injection for the command executor.
 */

import { injectable, inject } from 'tsyringe';
import type {
  IGitForkService,
  UpstreamPrStatus,
} from '../../../application/ports/output/services/git-fork-service.interface.js';
import {
  GitForkError,
  GitForkErrorCode,
} from '../../../application/ports/output/services/git-fork-service.interface.js';
import type { ExecFunction } from './worktree.service.js';

/** Keywords indicating an authentication failure in error messages. */
const AUTH_KEYWORDS = ['auth', 'credential', 'forbidden', '401', '403'];

/** Returns true when the error message suggests an authentication problem. */
function isAuthError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase();
  return AUTH_KEYWORDS.some((kw) => msg.includes(kw));
}

/** Parse owner/repo from a GitHub URL or nameWithOwner string. */
function parseOwnerRepo(raw: string): string {
  // Handle https://github.com/owner/repo[.git]
  const httpsMatch = raw.match(/github\.com[/:]([\w.-]+\/[\w.-]+?)(?:\.git)?$/);
  if (httpsMatch) return httpsMatch[1];
  // Handle git@github.com:owner/repo[.git]
  const sshMatch = raw.match(/git@github\.com:([\w.-]+\/[\w.-]+?)(?:\.git)?$/);
  if (sshMatch) return sshMatch[1];
  // Assume it's already "owner/repo"
  return raw.replace(/\.git$/, '');
}

/** Extract the PR number from a GitHub PR URL. */
function extractPrNumber(url: string): number {
  const match = url.match(/\/pull\/(\d+)/);
  if (!match) throw new Error(`Cannot parse PR number from URL: ${url}`);
  return parseInt(match[1], 10);
}

/** Normalise GitHub GraphQL state strings (OPEN/MERGED/CLOSED) to lowercase union. */
function normaliseState(state: string): 'open' | 'merged' | 'closed' {
  switch (state.toUpperCase()) {
    case 'OPEN':
      return 'open';
    case 'MERGED':
      return 'merged';
    case 'CLOSED':
    default:
      return 'closed';
  }
}

@injectable()
export class GitForkService implements IGitForkService {
  constructor(@inject('ExecFunction') private readonly execFile: ExecFunction) {}

  // ---------------------------------------------------------------------------
  // forkRepository
  // ---------------------------------------------------------------------------

  async forkRepository(cwd: string): Promise<void> {
    // Check if the current origin is already a fork.
    const viewResult = await this.execFile('gh', ['repo', 'view', '--json', 'isFork,parent'], {
      cwd,
    });
    const repoInfo = JSON.parse(viewResult.stdout) as {
      isFork: boolean;
      parent?: { nameWithOwner: string } | null;
    };

    if (repoInfo.isFork && repoInfo.parent) {
      // Origin is already a fork — just make sure `upstream` remote points to the parent.
      await this._ensureUpstreamRemote(cwd, repoInfo.parent.nameWithOwner);
      return;
    }

    // Not yet a fork — create one and remap remotes.
    try {
      const { stderr } = await this.execFile(
        'gh',
        ['repo', 'fork', '--remote', '--remote-name', 'origin'],
        { cwd }
      );
      // gh exits 0 even for "already exists" — treat it as success.
      if (stderr?.toLowerCase().includes('already exists')) {
        return;
      }
    } catch (err) {
      if (isAuthError(err)) {
        throw new GitForkError(
          `Authentication failed while forking repository: ${(err as Error).message}`,
          GitForkErrorCode.AUTH_FAILURE,
          err instanceof Error ? err : undefined
        );
      }
      throw new GitForkError(
        `Failed to fork repository: ${(err as Error).message}`,
        GitForkErrorCode.FORK_FAILED,
        err instanceof Error ? err : undefined
      );
    }
  }

  /** Ensure that an `upstream` remote exists pointing to `nameWithOwner`. */
  private async _ensureUpstreamRemote(cwd: string, nameWithOwner: string): Promise<void> {
    const { stdout } = await this.execFile('git', ['remote'], { cwd });
    const remotes = stdout
      .split('\n')
      .map((r) => r.trim())
      .filter(Boolean);
    if (!remotes.includes('upstream')) {
      await this.execFile(
        'git',
        ['remote', 'add', 'upstream', `https://github.com/${nameWithOwner}.git`],
        { cwd }
      );
    }
  }

  // ---------------------------------------------------------------------------
  // pushToFork
  // ---------------------------------------------------------------------------

  async pushToFork(cwd: string, branch: string): Promise<void> {
    try {
      await this.execFile('git', ['push', '-u', 'origin', branch], { cwd });
    } catch (err) {
      if (isAuthError(err)) {
        throw new GitForkError(
          `Authentication failed while pushing to fork: ${(err as Error).message}`,
          GitForkErrorCode.AUTH_FAILURE,
          err instanceof Error ? err : undefined
        );
      }
      throw new GitForkError(
        `Failed to push branch "${branch}" to fork: ${(err as Error).message}`,
        GitForkErrorCode.PUSH_FAILED,
        err instanceof Error ? err : undefined
      );
    }
  }

  // ---------------------------------------------------------------------------
  // createUpstreamPr
  // ---------------------------------------------------------------------------

  async createUpstreamPr(
    cwd: string,
    title: string,
    body: string,
    head: string,
    base: string
  ): Promise<{ url: string; number: number }> {
    const upstreamRepo = await this._getUpstreamRepo(cwd);

    try {
      const { stdout } = await this.execFile(
        'gh',
        [
          'pr',
          'create',
          '--repo',
          upstreamRepo,
          '--title',
          title,
          '--body',
          body,
          '--head',
          head,
          '--base',
          base,
        ],
        { cwd }
      );
      const url = stdout.trim();
      const number = extractPrNumber(url);
      return { url, number };
    } catch (err) {
      if (isAuthError(err)) {
        throw new GitForkError(
          `Authentication failed while creating upstream PR: ${(err as Error).message}`,
          GitForkErrorCode.AUTH_FAILURE,
          err instanceof Error ? err : undefined
        );
      }
      throw new GitForkError(
        `Failed to create upstream PR: ${(err as Error).message}`,
        GitForkErrorCode.UPSTREAM_PR_FAILED,
        err instanceof Error ? err : undefined
      );
    }
  }

  // ---------------------------------------------------------------------------
  // getUpstreamPrStatus
  // ---------------------------------------------------------------------------

  async getUpstreamPrStatus(upstreamRepo: string, prNumber: number): Promise<UpstreamPrStatus> {
    try {
      const { stdout } = await this.execFile(
        'gh',
        ['pr', 'view', String(prNumber), '--repo', upstreamRepo, '--json', 'state,url,number'],
        {}
      );
      const data = JSON.parse(stdout) as { state: string; url: string; number: number };
      return {
        state: normaliseState(data.state),
        url: data.url,
        number: data.number,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase();
      if (isAuthError(err)) {
        throw new GitForkError(
          `Authentication failed while fetching upstream PR status: ${(err as Error).message}`,
          GitForkErrorCode.AUTH_FAILURE,
          err instanceof Error ? err : undefined
        );
      }
      if (msg.includes('not found') || msg.includes('no pull requests found')) {
        throw new GitForkError(
          `Upstream PR #${prNumber} not found in ${upstreamRepo}`,
          GitForkErrorCode.UPSTREAM_PR_NOT_FOUND,
          err instanceof Error ? err : undefined
        );
      }
      throw new GitForkError(
        `Failed to fetch upstream PR status: ${(err as Error).message}`,
        GitForkErrorCode.UPSTREAM_PR_NOT_FOUND,
        err instanceof Error ? err : undefined
      );
    }
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /**
   * Resolve the upstream repo as "owner/repo".
   * 1. Try `git remote get-url upstream` and parse it.
   * 2. Fall back to `gh repo view --json parent`.
   */
  private async _getUpstreamRepo(cwd: string): Promise<string> {
    try {
      const { stdout } = await this.execFile('git', ['remote', 'get-url', 'upstream'], { cwd });
      return parseOwnerRepo(stdout.trim());
    } catch {
      // No upstream remote — try to infer from gh repo view parent.
      const { stdout } = await this.execFile('gh', ['repo', 'view', '--json', 'parent'], { cwd });
      const data = JSON.parse(stdout) as { parent?: { nameWithOwner: string } | null };
      if (data.parent?.nameWithOwner) {
        return data.parent.nameWithOwner;
      }
      throw new GitForkError(
        'Cannot determine upstream repository. No upstream remote configured and repo has no parent.',
        GitForkErrorCode.UPSTREAM_PR_FAILED
      );
    }
  }
}
