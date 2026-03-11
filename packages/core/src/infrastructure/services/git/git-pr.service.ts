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
  DiffHunk,
  DiffLine,
  DiffSummary,
  FileDiff,
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

  async getRemoteUrl(cwd: string): Promise<string | null> {
    try {
      const { stdout } = await this.execFile('git', ['remote', 'get-url', 'origin'], { cwd });
      const raw = stdout.trim();
      if (!raw) return null;
      // Convert SSH URLs to HTTPS: git@github.com:org/repo.git → https://github.com/org/repo
      if (raw.startsWith('git@')) {
        return raw.replace(/^git@([^:]+):/, 'https://$1/').replace(/\.git$/, '');
      }
      // Strip trailing .git from HTTPS URLs
      return raw.replace(/\.git$/, '');
    } catch {
      return null;
    }
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

    // 2. Check for common default branch names locally.
    //    If both exist, pick the one with the most recent commit.
    const candidates: string[] = [];
    for (const name of ['main', 'master']) {
      try {
        const { stdout } = await this.execFile(
          'git',
          ['rev-parse', '--verify', `refs/heads/${name}`],
          { cwd }
        );
        if (stdout.trim()) candidates.push(name);
      } catch {
        // Branch doesn't exist — try next
      }
    }
    if (candidates.length === 1) return candidates[0];
    if (candidates.length > 1) {
      // Pick the branch with the most recent commit
      try {
        const { stdout } = await this.execFile(
          'git',
          [
            'for-each-ref',
            '--sort=-committerdate',
            '--format=%(refname:short)',
            ...candidates.map((c) => `refs/heads/${c}`),
          ],
          { cwd }
        );
        const newest = stdout.trim().split('\n')[0];
        if (newest) return newest;
      } catch {
        // Fall through to first candidate
      }
      return candidates[0];
    }

    // 3. Check git config init.defaultBranch (user/system-level default)
    try {
      const { stdout } = await this.execFile('git', ['config', 'init.defaultBranch'], { cwd });
      const configured = stdout.trim();
      if (configured) return configured;
    } catch {
      // Not configured — continue
    }

    // 4. Fall back to current branch ONLY in the main worktree (not feature worktrees).
    // In a feature worktree, symbolic-ref HEAD returns the feature branch, not the default.
    try {
      const gitDir = await this.execFile('git', ['rev-parse', '--git-dir'], { cwd });
      const gitCommonDir = await this.execFile('git', ['rev-parse', '--git-common-dir'], { cwd });
      const isMainWorktree = gitDir.stdout.trim() === gitCommonDir.stdout.trim();
      if (isMainWorktree) {
        const { stdout } = await this.execFile('git', ['symbolic-ref', '--short', 'HEAD'], { cwd });
        const branch = stdout.trim();
        if (branch) return branch;
      }
    } catch {
      // Detached HEAD or other error — continue
    }

    // 5. Ultimate fallback — throw instead of silently guessing
    throw new Error(
      `Unable to determine default branch for repository at ${cwd}. ` +
        `No remote HEAD, no main/master branch, and no init.defaultBranch configured.`
    );
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
    try {
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
    } catch (error) {
      throw this.parseGhError(error);
    }
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

      // gh run watch --exit-status exits 0 when the run succeeds.
      // If we reach here (no exception), CI passed — no need for fragile stdout parsing.
      return {
        status: 'success',
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

  async getFileDiffs(cwd: string, baseBranch: string): Promise<FileDiff[]> {
    try {
      const { stdout } = await this.execFile(
        'git',
        ['diff', '--unified=3', `${baseBranch}...HEAD`],
        { cwd }
      );
      return this.parseUnifiedDiff(stdout);
    } catch (error) {
      throw this.parseGitError(error);
    }
  }

  private parseUnifiedDiff(rawDiff: string): FileDiff[] {
    if (!rawDiff.trim()) return [];

    const files: FileDiff[] = [];
    // Split on "diff --git" boundaries (keeping the delimiter)
    const fileSections = rawDiff.split(/^(?=diff --git )/m).filter((s) => s.trim());

    for (const section of fileSections) {
      const file = this.parseFileDiff(section);
      if (file) files.push(file);
    }

    return files;
  }

  private parseFileDiff(section: string): FileDiff | null {
    const lines = section.split('\n');
    if (lines.length === 0) return null;

    // Parse header: "diff --git a/path b/path"
    const headerMatch = lines[0].match(/^diff --git a\/(.+?) b\/(.+)$/);
    if (!headerMatch) return null;

    const oldPath = headerMatch[1];
    const newPath = headerMatch[2];

    // Determine status from diff header lines
    let status: FileDiff['status'] = 'modified';
    const isNew = lines.some((l) => l.startsWith('new file mode'));
    const isDeleted = lines.some((l) => l.startsWith('deleted file mode'));
    const isRenamed = lines.some((l) => l.startsWith('rename from'));

    if (isNew) status = 'added';
    else if (isDeleted) status = 'deleted';
    else if (isRenamed) status = 'renamed';

    // Parse hunks
    const hunks: DiffHunk[] = [];
    let currentHunk: DiffHunk | null = null;
    let oldLineNum = 0;
    let newLineNum = 0;
    let additions = 0;
    let deletions = 0;

    for (const line of lines) {
      const hunkHeaderMatch = line.match(/^@@\s+-(\d+)(?:,\d+)?\s+\+(\d+)(?:,\d+)?\s+@@(.*)$/);
      if (hunkHeaderMatch) {
        currentHunk = { header: line, lines: [] };
        hunks.push(currentHunk);
        oldLineNum = parseInt(hunkHeaderMatch[1], 10);
        newLineNum = parseInt(hunkHeaderMatch[2], 10);
        continue;
      }

      if (!currentHunk) continue;

      if (line.startsWith('+')) {
        const diffLine: DiffLine = {
          type: 'added',
          content: line.slice(1),
          newNumber: newLineNum,
        };
        currentHunk.lines.push(diffLine);
        newLineNum++;
        additions++;
      } else if (line.startsWith('-')) {
        const diffLine: DiffLine = {
          type: 'removed',
          content: line.slice(1),
          oldNumber: oldLineNum,
        };
        currentHunk.lines.push(diffLine);
        oldLineNum++;
        deletions++;
      } else if (line.startsWith(' ')) {
        const diffLine: DiffLine = {
          type: 'context',
          content: line.slice(1),
          oldNumber: oldLineNum,
          newNumber: newLineNum,
        };
        currentHunk.lines.push(diffLine);
        oldLineNum++;
        newLineNum++;
      }
      // Skip lines like "\ No newline at end of file"
    }

    return {
      path: newPath,
      oldPath: isRenamed || oldPath !== newPath ? oldPath : undefined,
      additions,
      deletions,
      status,
      hunks,
    };
  }

  async listPrStatuses(cwd: string): Promise<PrStatusInfo[]> {
    try {
      const { stdout } = await this.execFile(
        'gh',
        [
          'pr',
          'list',
          '--json',
          'number,state,url,headRefName,mergeable',
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
        mergeable?: string;
      }[];
      return prs.map((pr) => ({
        number: pr.number,
        state: this.normalizeGhState(pr.state),
        url: pr.url,
        headRefName: pr.headRefName,
        mergeable: this.parseMergeable(pr.mergeable),
      }));
    } catch (error) {
      throw this.parseGhError(error);
    }
  }

  async getMergeableStatus(cwd: string, prNumber: number): Promise<boolean | undefined> {
    try {
      const { stdout } = await this.execFile(
        'gh',
        ['pr', 'view', String(prNumber), '--json', 'mergeable'],
        { cwd }
      );
      const result = JSON.parse(stdout) as { mergeable?: string };
      return this.parseMergeable(result.mergeable);
    } catch (error) {
      throw this.parseGhError(error);
    }
  }

  async verifyMerge(cwd: string, featureBranch: string, baseBranch: string): Promise<boolean> {
    // Resolve the feature branch ref — the local branch may have been deleted
    // after a squash merge (git branch -d succeeds when pushed to remote).
    // Fall back to the remote tracking branch if the local ref is gone.
    const resolvedRef = await this.resolveRef(cwd, featureBranch);
    if (!resolvedRef) return false;

    // First try: true merge (feature branch is ancestor of base)
    try {
      await this.execFile('git', ['merge-base', '--is-ancestor', resolvedRef, baseBranch], {
        cwd,
      });
      return true;
    } catch {
      // Not a true merge — check for squash merge by comparing tree content.
      // After a squash merge, all changes from the feature branch are on the base
      // branch, so `git diff featureBranch baseBranch` should produce no output.
    }

    try {
      await this.execFile('git', ['diff', '--quiet', resolvedRef, baseBranch], { cwd });
      // --quiet exits 0 when there's no diff → squash merge verified
      return true;
    } catch {
      // Exit code 1 = diff exists (not merged), other errors also mean unverified
      return false;
    }
  }

  /**
   * Resolve a branch name to a valid git ref, falling back to the remote
   * tracking branch if the local ref has been deleted.
   */
  private async resolveRef(cwd: string, branch: string): Promise<string | null> {
    // Try local ref first
    try {
      await this.execFile('git', ['rev-parse', '--verify', branch], { cwd });
      return branch;
    } catch {
      // Local ref doesn't exist
    }

    // Try remote tracking branch
    const remoteRef = `origin/${branch}`;
    try {
      await this.execFile('git', ['rev-parse', '--verify', remoteRef], { cwd });
      return remoteRef;
    } catch {
      return null;
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

  private parseMergeable(value: string | undefined): boolean | undefined {
    if (value === 'MERGEABLE') return true;
    if (value === 'CONFLICTING') return false;
    return undefined; // UNKNOWN or missing
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
