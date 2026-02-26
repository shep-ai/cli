/**
 * GitPrService.watchCi Integration Tests
 *
 * Exercises output parsing, logExcerpt population, command construction,
 * and timeout forwarding using a controlled vi.fn() ExecFunction fake.
 */

import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GitPrService } from '@/infrastructure/services/git/git-pr.service';
import {
  GitPrError,
  GitPrErrorCode,
} from '@/application/ports/output/services/git-pr-service.interface';
import type { ExecFunction } from '@/infrastructure/services/git/worktree.service';

describe('GitPrService.watchCi integration', () => {
  let mockExec: ExecFunction;
  let service: GitPrService;
  const cwd = '/repo';
  const branch = 'feat/my-branch';
  const runId = 12345;

  /** Helper: mock the gh run list call that resolves the latest run ID */
  function mockRunList() {
    vi.mocked(mockExec).mockResolvedValueOnce({
      stdout: JSON.stringify([{ databaseId: runId }]),
      stderr: '',
    });
  }

  beforeEach(() => {
    mockExec = vi.fn();
    service = new GitPrService(mockExec);
  });

  it('success: multi-line stdout with "success" returns status=success and exact logExcerpt', async () => {
    const successStdout = `
Waiting for run to complete...
Run in progress...
Run completed: success
`.trim();

    mockRunList();
    vi.mocked(mockExec).mockResolvedValueOnce({ stdout: successStdout, stderr: '' });

    const result = await service.watchCi(cwd, branch);

    expect(mockExec).toHaveBeenNthCalledWith(
      1,
      'gh',
      ['run', 'list', '--branch', branch, '--json', 'databaseId', '--limit', '1'],
      { cwd }
    );
    expect(mockExec).toHaveBeenNthCalledWith(
      2,
      'gh',
      ['run', 'watch', String(runId), '--exit-status'],
      { cwd }
    );
    expect(result.status).toBe('success');
    expect(result.logExcerpt).toBe(successStdout.trim());
  });

  it('failure: gh run watch --exit-status exits non-zero on CI failure, returns status=failure', async () => {
    // gh run watch --exit-status exits non-zero when the run fails.
    // Node.js execFile rejects with an error containing stdout/stderr.
    const execError = new Error('Command failed: gh run watch 12345 --exit-status\n') as Error & {
      code: number;
      stdout: string;
      stderr: string;
    };
    execError.code = 1;
    execError.stdout = "Run CI (12345) has already completed with 'failure'\n";
    execError.stderr = '';

    mockRunList();
    vi.mocked(mockExec).mockRejectedValueOnce(execError);

    const result = await service.watchCi(cwd, branch);

    expect(result.status).toBe('failure');
    expect(result.logExcerpt).toContain('failure');
  });

  it('cancelled: gh run watch --exit-status exits non-zero on cancelled run, returns status=failure', async () => {
    const execError = new Error('Command failed: gh run watch 12345 --exit-status\n') as Error & {
      code: number;
      stdout: string;
      stderr: string;
    };
    execError.code = 1;
    execError.stdout = "Run CI (12345) has already completed with 'cancelled'\n";
    execError.stderr = '';

    mockRunList();
    vi.mocked(mockExec).mockRejectedValueOnce(execError);

    const result = await service.watchCi(cwd, branch);

    expect(result.status).toBe('failure');
  });

  it('returns pending when no runs found for branch', async () => {
    vi.mocked(mockExec).mockResolvedValueOnce({
      stdout: JSON.stringify([]),
      stderr: '',
    });

    const result = await service.watchCi(cwd, branch);

    expect(result.status).toBe('pending');
  });

  it('CI_TIMEOUT: exec rejection with "timed out" throws GitPrError with CI_TIMEOUT code', async () => {
    const timeoutMs = 30000;
    mockRunList();
    vi.mocked(mockExec).mockRejectedValueOnce(new Error('timed out waiting for run'));

    let thrown: unknown;
    try {
      await service.watchCi(cwd, branch, timeoutMs);
    } catch (e) {
      thrown = e;
    }

    expect(thrown).toBeInstanceOf(GitPrError);
    expect((thrown as GitPrError).code).toBe(GitPrErrorCode.CI_TIMEOUT);
    // First call: run list (no timeout). Second call: run watch (with timeout).
    expect(mockExec).toHaveBeenNthCalledWith(
      2,
      'gh',
      ['run', 'watch', String(runId), '--exit-status'],
      {
        cwd,
        timeout: timeoutMs,
      }
    );
  });
});
