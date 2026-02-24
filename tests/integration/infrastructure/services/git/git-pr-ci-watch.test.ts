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

    vi.mocked(mockExec)
      .mockResolvedValueOnce({ stdout: JSON.stringify([{ databaseId: runId }]), stderr: '' })
      .mockResolvedValueOnce({ stdout: successStdout, stderr: '' });

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

  it('failure: multi-line stdout with no success/completed keyword returns status=failure', async () => {
    const failureStdout = `
Waiting for run to complete...
Run in progress...
Run concluded: failure
`.trim();

    vi.mocked(mockExec)
      .mockResolvedValueOnce({ stdout: JSON.stringify([{ databaseId: runId }]), stderr: '' })
      .mockResolvedValueOnce({ stdout: failureStdout, stderr: '' });

    const result = await service.watchCi(cwd, branch);

    expect(result.status).toBe('failure');
    expect(result.logExcerpt).toBe(failureStdout.trim());
  });

  it('cancelled: multi-line stdout with "cancelled" returns status=failure', async () => {
    const cancelledStdout = `
Waiting for run to complete...
Run in progress...
Run concluded: cancelled
`.trim();

    vi.mocked(mockExec)
      .mockResolvedValueOnce({ stdout: JSON.stringify([{ databaseId: runId }]), stderr: '' })
      .mockResolvedValueOnce({ stdout: cancelledStdout, stderr: '' });

    const result = await service.watchCi(cwd, branch);

    expect(result.status).toBe('failure');
  });

  it('pending: empty run list returns status=pending', async () => {
    vi.mocked(mockExec).mockResolvedValueOnce({ stdout: JSON.stringify([]), stderr: '' });

    const result = await service.watchCi(cwd, branch);

    expect(result.status).toBe('pending');
  });

  it('CI_TIMEOUT: exec rejection with "timed out" throws GitPrError with CI_TIMEOUT code', async () => {
    const timeoutMs = 30000;
    vi.mocked(mockExec)
      .mockResolvedValueOnce({ stdout: JSON.stringify([{ databaseId: runId }]), stderr: '' })
      .mockRejectedValueOnce(new Error('timed out waiting for run'));

    let thrown: unknown;
    try {
      await service.watchCi(cwd, branch, timeoutMs);
    } catch (e) {
      thrown = e;
    }

    expect(thrown).toBeInstanceOf(GitPrError);
    expect((thrown as GitPrError).code).toBe(GitPrErrorCode.CI_TIMEOUT);
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
