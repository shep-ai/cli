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
  PrStatusInfo,
} from '../../../application/ports/output/services/git-pr-service.interface.js';
import {
  GitPrError,
  GitPrErrorCode,
} from '../../../application/ports/output/services/git-pr-service.interface.js';
import { readFileSync } from 'node:fs';
import yaml from 'js-yaml';
import { PrStatus } from '../../../domain/generated/output.js';
import type { ExecFunction } from './worktree.service.js';

@injectable()
export class GitPrService implements IGitPrService {
  constructor(@inject('ExecFunction') private readonly execFile: ExecFunction) {}

  async hasRemote(cwd: string): Promise<boolean> {
    const { stdout } = await this.execFile('git', ['remote'], { cwd });
    return stdout.trim().length > 0;
  }

  async getDefaultBranch(cwd: string): Promise<string> {
    // 1. Try remote HEAD reference (most reliable when remote exists)
    try {
      const { stdout } = await this.execFile('git', ['symbolic-ref', 'refs/remotes/origin/HEAD'], {
        cwd,
      });
      const ref = stdout.trim(); // e.g. "refs/remotes/origin/main"
      if (ref) return ref.replace('refs/remotes/origin/', '');
    } catch {
      // No remote HEAD configured — continue to fallbacks
    }

    // 2. Check for common default branch names locally
    for (const candidate of ['main', 'master']) {
      try {
        const { stdout } = await this.execFile(
          'git',
          ['rev-parse', '--verify', `refs/heads/${candidate}`],
          { cwd }
        );
        if (stdout.trim()) return candidate;
      } catch {
        // Branch doesn't exist — try next
      }
    }

    // 3. Fall back to current branch (works for single-branch / fresh repos)
    try {
      const { stdout } = await this.execFile('git', ['symbolic-ref', '--short', 'HEAD'], { cwd });
      const branch = stdout.trim();
      if (branch) return branch;
    } catch {
      // Detached HEAD — continue
    }

    // 4. Ultimate fallback
    return 'main';
  }

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
      // Parse pr.yaml to extract PR metadata
      const prYamlContent = readFileSync(prYamlPath, 'utf-8');
      const prData = yaml.load(prYamlContent) as {
        title?: string;
        body?: string;
        baseBranch?: string;
        headBranch?: string;
        labels?: string[];
        draft?: boolean;
      };

      const title = prData.title ?? 'Untitled PR';
      const body = prData.body ?? '';
      const args = ['pr', 'create', '--title', title, '--body', body];

      if (prData.baseBranch) {
        args.push('--base', prData.baseBranch);
      }
      if (prData.headBranch) {
        args.push('--head', prData.headBranch);
      }
      if (prData.labels?.length) {
        args.push('--label', prData.labels.join(','));
      }
      if (prData.draft) {
        args.push('--draft');
      }

      const { stdout } = await this.execFile('gh', args, { cwd });
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
      // gh run watch requires a run ID — it does not support --branch.
      // First, resolve the latest run ID for the branch via gh run list.
      const { stdout: listOut } = await this.execFile(
        'gh',
        ['run', 'list', '--branch', branch, '--json', 'databaseId', '--limit', '1'],
        { cwd }
      );
      const runs = JSON.parse(listOut) as { databaseId: number }[];
      if (runs.length === 0 || !runs[0].databaseId) {
        return { status: 'pending' };
      }

      const runId = String(runs[0].databaseId);
      const args = ['run', 'watch', runId, '--exit-status'];
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
      // gh run watch --exit-status exits non-zero when the run fails.
      // Node.js execFile produces errors with a numeric `code` (exit code) and
      // stdout/stderr from the process. The error.message is typically
      // "Command failed: gh run watch <id> --exit-status\n" — detect this by
      // checking for a numeric exit code or the "Command failed" prefix.
      const exitCode = (error as NodeJS.ErrnoException)?.code;
      const hasNumericExitCode = typeof exitCode === 'number';
      const isCommandFailure = message.includes('Command failed') || message.includes('exit code');
      if (hasNumericExitCode || isCommandFailure) {
        // Build a useful log excerpt from stdout/stderr if available
        const errObj = error as { stdout?: string; stderr?: string };
        const parts = [errObj.stdout, errObj.stderr, message].filter(Boolean);
        return { status: 'failure', logExcerpt: parts.join('\n').trim() };
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

  async listPrStatuses(cwd: string): Promise<PrStatusInfo[]> {
    try {
      const { stdout } = await this.execFile(
        'gh',
        [
          'pr',
          'list',
          '--json',
          'number,state,url,headRefName',
          '--state',
          'all',
          '--limit',
          '100',
        ],
        { cwd }
      );

      const prs = JSON.parse(stdout) as {
        number: number;
        state: string;
        url: string;
        headRefName: string;
      }[];
      return prs.map((pr) => ({
        number: pr.number,
        state: this.normalizeGhState(pr.state),
        url: pr.url,
        headRefName: pr.headRefName,
      }));
    } catch (error) {
      throw this.parseGhError(error);
    }
  }

  async verifyMerge(cwd: string, featureBranch: string, baseBranch: string): Promise<boolean> {
    try {
      await this.execFile('git', ['merge-base', '--is-ancestor', featureBranch, baseBranch], {
        cwd,
      });
      return true;
    } catch {
      return false;
    }
  }

  async getFailureLogs(runId: string, _branch: string, logMaxChars = 50_000): Promise<string> {
    try {
      const { stdout } = await this.execFile('gh', ['run', 'view', runId, '--log-failed'], {
        cwd: undefined,
      });
      return this.truncateLog(stdout, logMaxChars, runId);
    } catch (error) {
      throw this.parseGhError(error);
    }
  }

  private truncateLog(output: string, maxChars: number, runId: string): string {
    if (output.length <= maxChars) return output;
    return `${output.slice(
      0,
      maxChars
    )}\n[Log truncated at ${maxChars} chars — full log available via gh run view ${runId}]`;
  }

  private normalizeGhState(state: string): PrStatus {
    const normalized = state.charAt(0).toUpperCase() + state.slice(1).toLowerCase();
    return normalized as PrStatus;
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
