/**
 * Git PR Service Implementation
 *
 * Manages git operations for PR creation, merging, and CI status checks.
 * Uses constructor dependency injection for the command executor.
 */

import { injectable, inject } from 'tsyringe';
import type { IGitPrService } from '../../../application/ports/output/services/git-pr-service.interface.js';
import type {
  CiStatusResult,
  DiffSummary,
  MergeStrategy,
  PrCreateResult,
} from '../../../application/ports/output/services/git-pr-service.interface.js';
import {
  GitPrError,
  GitPrErrorCode,
} from '../../../application/ports/output/services/git-pr-service.interface.js';
import type { ExecFunction } from './worktree.service.js';

@injectable()
export class GitPrService implements IGitPrService {
  constructor(@inject('ExecFunction') private readonly execFile: ExecFunction) {}

  async hasUncommittedChanges(cwd: string): Promise<boolean> {
    const { stdout } = await this.execFile('git', ['status', '--porcelain'], { cwd });
    return stdout.trim().length > 0;
  }

  async commitAll(cwd: string, message: string): Promise<string> {
    try {
      await this.execFile('git', ['add', '-A'], { cwd });
      await this.execFile('git', ['commit', '-m', message], { cwd });
      const { stdout } = await this.execFile('git', ['rev-parse', 'HEAD'], { cwd });
      return stdout.trim();
    } catch (error) {
      throw this.parseGitError(error);
    }
  }

  async push(cwd: string, branch: string, setUpstream?: boolean): Promise<void> {
    const args = ['push'];
    if (setUpstream) args.push('--set-upstream');
    args.push('origin', branch);

    try {
      await this.execFile('git', args, { cwd });
    } catch (error) {
      throw this.parseGitError(error);
    }
  }

  async createPr(cwd: string, prYamlPath: string): Promise<PrCreateResult> {
    try {
      const { stdout } = await this.execFile(
        'gh',
        ['pr', 'create', '--title', prYamlPath, '--body-file', prYamlPath],
        { cwd }
      );
      const url = stdout.trim();
      const number = this.parsePrNumberFromUrl(url);
      return { url, number };
    } catch (error) {
      throw this.parseGhError(error);
    }
  }

  async mergePr(cwd: string, prNumber: number, strategy: MergeStrategy = 'squash'): Promise<void> {
    try {
      await this.execFile('gh', ['pr', 'merge', String(prNumber), `--${strategy}`], { cwd });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const cause = error instanceof Error ? error : undefined;
      throw new GitPrError(message, GitPrErrorCode.MERGE_FAILED, cause);
    }
  }

  async mergeBranch(cwd: string, sourceBranch: string, targetBranch: string): Promise<void> {
    try {
      await this.execFile('git', ['checkout', targetBranch], { cwd });
      await this.execFile('git', ['merge', sourceBranch], { cwd });
      await this.execFile('git', ['push'], { cwd });
    } catch (error) {
      throw this.parseGitError(error);
    }
  }

  async getCiStatus(cwd: string, branch: string): Promise<CiStatusResult> {
    const { stdout } = await this.execFile(
      'gh',
      ['run', 'list', '--branch', branch, '--json', 'conclusion,url', '--limit', '1'],
      { cwd }
    );

    const runs = JSON.parse(stdout) as { conclusion: string | null; url: string }[];
    if (runs.length === 0 || !runs[0].conclusion) {
      return { status: 'pending', runUrl: runs[0]?.url };
    }

    return {
      status: runs[0].conclusion === 'success' ? 'success' : 'failure',
      runUrl: runs[0].url,
    };
  }

  async watchCi(cwd: string, branch: string, timeoutMs?: number): Promise<CiStatusResult> {
    try {
      const args = ['run', 'watch', '--branch', branch];
      const { stdout } = await this.execFile('gh', args, {
        cwd,
        ...(timeoutMs ? { timeout: timeoutMs } : {}),
      });

      const isSuccess = stdout.includes('success') || stdout.includes('completed');
      return {
        status: isSuccess ? 'success' : 'failure',
        logExcerpt: stdout.trim(),
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const cause = error instanceof Error ? error : undefined;
      if (message.includes('timed out') || message.includes('timeout')) {
        throw new GitPrError(message, GitPrErrorCode.CI_TIMEOUT, cause);
      }
      throw new GitPrError(message, GitPrErrorCode.GIT_ERROR, cause);
    }
  }

  async deleteBranch(cwd: string, branch: string, deleteRemote?: boolean): Promise<void> {
    try {
      await this.execFile('git', ['branch', '-d', branch], { cwd });
      if (deleteRemote) {
        await this.execFile('git', ['push', 'origin', '--delete', branch], { cwd });
      }
    } catch (error) {
      throw this.parseGitError(error);
    }
  }

  async getPrDiffSummary(cwd: string, baseBranch: string): Promise<DiffSummary> {
    const { stdout: diffStat } = await this.execFile(
      'git',
      ['diff', '--stat', `${baseBranch}...HEAD`],
      { cwd }
    );
    const { stdout: logOutput } = await this.execFile(
      'git',
      ['log', '--oneline', `${baseBranch}...HEAD`],
      { cwd }
    );

    return this.parseDiffStat(diffStat, logOutput);
  }

  private parseGitError(error: unknown): GitPrError {
    const message = error instanceof Error ? error.message : String(error);
    const cause = error instanceof Error ? error : undefined;

    if (message.includes('rejected') || message.includes('conflict')) {
      return new GitPrError(message, GitPrErrorCode.MERGE_CONFLICT, cause);
    }
    if (message.includes('Authentication') || message.includes('auth') || message.includes('403')) {
      return new GitPrError(message, GitPrErrorCode.AUTH_FAILURE, cause);
    }

    return new GitPrError(message, GitPrErrorCode.GIT_ERROR, cause);
  }

  private parseGhError(error: unknown): GitPrError {
    const message = error instanceof Error ? error.message : String(error);
    const cause = error instanceof Error ? error : undefined;
    const errnoCode = (error as NodeJS.ErrnoException)?.code;

    if (errnoCode === 'ENOENT' || message.includes('ENOENT')) {
      return new GitPrError(message, GitPrErrorCode.GH_NOT_FOUND, cause);
    }
    if (message.includes('Authentication') || message.includes('auth') || message.includes('403')) {
      return new GitPrError(message, GitPrErrorCode.AUTH_FAILURE, cause);
    }

    return new GitPrError(message, GitPrErrorCode.GIT_ERROR, cause);
  }

  private parsePrNumberFromUrl(url: string): number {
    const match = url.match(/\/pull\/(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  }

  private parseDiffStat(diffStat: string, logOutput: string): DiffSummary {
    const summaryLine = diffStat.trim().split('\n').pop() ?? '';
    const filesMatch = summaryLine.match(/(\d+)\s+files?\s+changed/);
    const addMatch = summaryLine.match(/(\d+)\s+insertions?\(\+\)/);
    const delMatch = summaryLine.match(/(\d+)\s+deletions?\(-\)/);
    const commitCount = logOutput
      .trim()
      .split('\n')
      .filter((l) => l.trim()).length;

    return {
      filesChanged: filesMatch ? parseInt(filesMatch[1], 10) : 0,
      additions: addMatch ? parseInt(addMatch[1], 10) : 0,
      deletions: delMatch ? parseInt(delMatch[1], 10) : 0,
      commitCount,
    };
  }
}
