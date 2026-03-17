/**
 * GitHub Repository Service Implementation
 *
 * Implements IGitHubRepositoryService using the gh CLI for authentication
 * checks, repository listing, cloning (with progress streaming), and URL parsing.
 */

import { injectable, inject } from 'tsyringe';
import { resolve, normalize } from 'node:path';
import { rm } from 'node:fs/promises';
import { spawn, type ChildProcess } from 'node:child_process';
import type { ExecFunction } from '../git/worktree.service.js';
import type {
  IGitHubRepositoryService,
  GitHubRepo,
  ListUserRepositoriesOptions,
  CloneOptions,
  ParsedGitHubUrl,
} from '../../../application/ports/output/services/github-repository-service.interface.js';
import {
  GitHubAuthError,
  GitHubCloneError,
  GitHubRepoListError,
  GitHubUrlParseError,
} from '../../../application/ports/output/services/github-repository-service.interface.js';

// ---------------------------------------------------------------------------
// URL regex patterns
// ---------------------------------------------------------------------------

/** Matches https://github.com/owner/repo or https://github.com/owner/repo.git */
const HTTPS_PATTERN = /^https:\/\/github\.com\/([^/]+)\/([^/.]+?)(?:\.git)?$/;

/** Matches git@github.com:owner/repo.git */
const SSH_PATTERN = /^git@github\.com:([^/]+)\/([^/.]+?)(?:\.git)?$/;

/** Matches owner/repo shorthand (no slashes except the one separating owner/repo) */
const SHORTHAND_PATTERN = /^([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)$/;

/** Default limit for listing repositories */
const DEFAULT_LIST_LIMIT = 30;

@injectable()
export class GitHubRepositoryService implements IGitHubRepositoryService {
  constructor(@inject('ExecFunction') private readonly execFile: ExecFunction) {}

  async checkAuth(): Promise<void> {
    try {
      // Use `gh auth token` instead of `gh auth status` because `gh auth status`
      // exits non-zero when *any* configured account has a stale token, even if
      // the active account is fully authenticated. `gh auth token` only checks the
      // active account and exits 0 as long as it has a valid token.
      await this.execFile('gh', ['auth', 'token']);
    } catch (error) {
      const cause = error instanceof Error ? error : undefined;
      const errnoCode = (error as NodeJS.ErrnoException)?.code;

      if (errnoCode === 'ENOENT') {
        throw new GitHubAuthError(
          'GitHub CLI (gh) is not installed. Install it from https://cli.github.com/',
          cause
        );
      }

      throw new GitHubAuthError(
        'GitHub CLI is not authenticated. Run `gh auth login` to sign in.',
        cause
      );
    }
  }

  async listUserRepositories(options?: ListUserRepositoriesOptions): Promise<GitHubRepo[]> {
    const limit = options?.limit ?? DEFAULT_LIST_LIMIT;
    const args = [
      'repo',
      'list',
      '--json',
      'name,nameWithOwner,description,isPrivate,pushedAt',
      '--limit',
      String(limit),
    ];

    if (options?.search) {
      // gh repo list does not have a --match flag; use jq to filter by name
      const escaped = options.search.replace(/"/g, '\\"');
      args.push('-q', `[.[] | select(.name | test("${escaped}"; "i"))]`);
    }

    try {
      const { stdout } = await this.execFile('gh', args);
      return JSON.parse(stdout) as GitHubRepo[];
    } catch (error) {
      const cause = error instanceof Error ? error : undefined;
      const errnoCode = (error as NodeJS.ErrnoException)?.code;

      if (errnoCode === 'ENOENT') {
        throw new GitHubRepoListError(
          'GitHub CLI (gh) is not installed. Install it from https://cli.github.com/',
          cause
        );
      }

      throw new GitHubRepoListError(
        `Failed to list GitHub repositories: ${cause?.message ?? String(error)}`,
        cause
      );
    }
  }

  async cloneRepository(
    nameWithOwner: string,
    destination: string,
    options?: CloneOptions
  ): Promise<void> {
    // Validate destination path — reject path traversal
    const resolved = resolve(destination);
    const normalized = normalize(resolved);
    if (normalized !== resolved || destination.includes('..')) {
      throw new GitHubCloneError(
        `Invalid clone destination: path traversal detected in "${destination}"`
      );
    }

    return new Promise<void>((resolvePromise, reject) => {
      const child: ChildProcess = spawn('gh', ['repo', 'clone', nameWithOwner, resolved], {
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      let stderrOutput = '';

      child.stderr?.on('data', (chunk: Buffer) => {
        const data = chunk.toString();
        stderrOutput += data;
        options?.onProgress?.(data);
      });

      child.stdout?.on('data', (chunk: Buffer) => {
        const data = chunk.toString();
        options?.onProgress?.(data);
      });

      child.on('error', async (error: Error) => {
        await this.cleanupPartialClone(resolved);
        reject(new GitHubCloneError(`Failed to clone ${nameWithOwner}: ${error.message}`, error));
      });

      child.on('close', async (code: number | null) => {
        if (code === 0) {
          resolvePromise();
        } else {
          await this.cleanupPartialClone(resolved);
          reject(
            new GitHubCloneError(
              `Clone of ${nameWithOwner} failed with exit code ${code}: ${stderrOutput.trim()}`
            )
          );
        }
      });
    });
  }

  parseGitHubUrl(url: string): ParsedGitHubUrl {
    const trimmed = url.trim();
    if (!trimmed) {
      throw new GitHubUrlParseError('URL cannot be empty');
    }

    // Try HTTPS format
    const httpsMatch = trimmed.match(HTTPS_PATTERN);
    if (httpsMatch) {
      return {
        owner: httpsMatch[1],
        repo: httpsMatch[2],
        nameWithOwner: `${httpsMatch[1]}/${httpsMatch[2]}`,
      };
    }

    // Try SSH format
    const sshMatch = trimmed.match(SSH_PATTERN);
    if (sshMatch) {
      return {
        owner: sshMatch[1],
        repo: sshMatch[2],
        nameWithOwner: `${sshMatch[1]}/${sshMatch[2]}`,
      };
    }

    // Try shorthand format (must be last — it's the loosest pattern)
    const shorthandMatch = trimmed.match(SHORTHAND_PATTERN);
    if (shorthandMatch) {
      return {
        owner: shorthandMatch[1],
        repo: shorthandMatch[2],
        nameWithOwner: `${shorthandMatch[1]}/${shorthandMatch[2]}`,
      };
    }

    throw new GitHubUrlParseError(
      `Unrecognized GitHub URL format: "${trimmed}". ` +
        'Supported formats: https://github.com/owner/repo, ' +
        'git@github.com:owner/repo.git, or owner/repo shorthand.'
    );
  }

  private async cleanupPartialClone(destination: string): Promise<void> {
    try {
      await rm(destination, { recursive: true, force: true });
    } catch {
      // Cleanup is best-effort
    }
  }
}
