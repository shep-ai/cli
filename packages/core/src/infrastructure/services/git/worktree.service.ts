/**
 * Git Worktree Service Implementation
 *
 * Manages git worktrees using native execFile for process execution.
 * Uses constructor dependency injection for the command executor
 * to enable testability without mocking node:child_process directly.
 */

import { createHash } from 'node:crypto';
import path from 'node:path';
import { injectable, inject } from 'tsyringe';
import type {
  IWorktreeService,
  WorktreeInfo,
} from '../../../application/ports/output/services/worktree-service.interface.js';
import {
  WorktreeError,
  WorktreeErrorCode,
} from '../../../application/ports/output/services/worktree-service.interface.js';
import { SHEP_HOME_DIR } from '../filesystem/shep-directory.service.js';

/**
 * Type for the command executor dependency.
 * Matches the promisified signature of child_process.execFile.
 */
export type ExecFunction = (
  file: string,
  args: string[],
  options?: object
) => Promise<{ stdout: string; stderr: string }>;

@injectable()
export class WorktreeService implements IWorktreeService {
  constructor(@inject('ExecFunction') private readonly execFile: ExecFunction) {}

  async create(repoPath: string, branch: string, worktreePath: string): Promise<WorktreeInfo> {
    try {
      await this.execFile('git', ['worktree', 'add', worktreePath, '-b', branch], {
        cwd: repoPath,
      });
    } catch (error) {
      throw this.parseGitError(error);
    }

    // Get info about the created worktree
    const worktrees = await this.list(repoPath);
    const created = worktrees.find((w) => w.path === worktreePath);
    if (!created) {
      throw new WorktreeError(
        'Worktree created but not found in list',
        WorktreeErrorCode.GIT_ERROR
      );
    }
    return created;
  }

  async remove(worktreePath: string): Promise<void> {
    try {
      await this.execFile('git', ['worktree', 'remove', worktreePath], {});
    } catch (error) {
      throw this.parseGitError(error);
    }
  }

  async list(repoPath: string): Promise<WorktreeInfo[]> {
    const { stdout } = await this.execFile('git', ['worktree', 'list', '--porcelain'], {
      cwd: repoPath,
    });
    return this.parseWorktreeOutput(stdout);
  }

  async exists(repoPath: string, branch: string): Promise<boolean> {
    const worktrees = await this.list(repoPath);
    return worktrees.some((w) => w.branch === branch);
  }

  getWorktreePath(repoPath: string, branch: string): string {
    const repoHash = createHash('sha256').update(repoPath).digest('hex').slice(0, 16);
    const slug = branch.replace(/\//g, '-');
    return path.join(SHEP_HOME_DIR, 'repos', repoHash, 'wt', slug);
  }

  private parseWorktreeOutput(output: string): WorktreeInfo[] {
    if (!output.trim()) return [];

    const worktrees: WorktreeInfo[] = [];
    const blocks = output.split('\n\n').filter((b) => b.trim());

    for (const block of blocks) {
      const lines = block.split('\n');
      const wtPath = lines.find((l) => l.startsWith('worktree '))?.slice('worktree '.length) ?? '';
      const head = lines.find((l) => l.startsWith('HEAD '))?.slice('HEAD '.length) ?? '';
      const branchLine = lines.find((l) => l.startsWith('branch '));
      const fullBranch = branchLine?.slice('branch '.length) ?? '';
      const branch = fullBranch.replace('refs/heads/', '');

      if (wtPath) {
        worktrees.push({
          path: wtPath,
          head,
          branch,
          isMain: worktrees.length === 0, // First entry is always main
        });
      }
    }

    return worktrees;
  }

  private parseGitError(error: unknown): WorktreeError {
    const message = error instanceof Error ? error.message : String(error);

    if (message.includes('already exists')) {
      return new WorktreeError(
        message,
        WorktreeErrorCode.ALREADY_EXISTS,
        error instanceof Error ? error : undefined
      );
    }
    if (message.includes('already checked out') || message.includes('is already checked out')) {
      return new WorktreeError(
        message,
        WorktreeErrorCode.BRANCH_IN_USE,
        error instanceof Error ? error : undefined
      );
    }
    if (message.includes('not a valid directory') || message.includes('is not a working tree')) {
      return new WorktreeError(
        message,
        WorktreeErrorCode.NOT_FOUND,
        error instanceof Error ? error : undefined
      );
    }

    return new WorktreeError(
      message,
      WorktreeErrorCode.GIT_ERROR,
      error instanceof Error ? error : undefined
    );
  }
}
