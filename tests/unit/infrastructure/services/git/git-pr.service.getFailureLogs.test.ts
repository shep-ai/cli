/**
 * GitPrService.getFailureLogs Unit Tests
 *
 * TDD Phase: RED-GREEN
 * Tests for the getFailureLogs method that retrieves CI failure logs
 * via `gh run view <runId> --log-failed` with head-truncation.
 */

import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GitPrService } from '@/infrastructure/services/git/git-pr.service';
import {
  GitPrError,
  GitPrErrorCode,
} from '@/application/ports/output/services/git-pr-service.interface';
import type { ExecFunction } from '@/infrastructure/services/git/worktree.service';

vi.mock('node:fs', async () => {
  const actual = await vi.importActual<object>('node:fs');
  return { ...actual, readFileSync: vi.fn() };
});

describe('GitPrService.getFailureLogs', () => {
  let mockExec: ExecFunction;
  let service: GitPrService;

  beforeEach(() => {
    mockExec = vi.fn();
    service = new GitPrService(mockExec);
  });

  it('should return full output when under logMaxChars limit', async () => {
    const shortLog = 'Error: some test failed\n  at test.ts:10:5\n';
    vi.mocked(mockExec).mockResolvedValue({ stdout: shortLog, stderr: '' });

    const result = await service.getFailureLogs('12345', 'feat/my-branch', 50_000);

    expect(mockExec).toHaveBeenCalledWith('gh', ['run', 'view', '12345', '--log-failed'], {
      cwd: undefined,
    });
    expect(result).toBe(shortLog);
  });

  it('should truncate output and append notice when over logMaxChars limit', async () => {
    const longLog = 'A'.repeat(100);
    vi.mocked(mockExec).mockResolvedValue({ stdout: longLog, stderr: '' });

    const result = await service.getFailureLogs('99999', 'feat/my-branch', 50);

    expect(result).toBe(
      `${'A'.repeat(50)}\n[Log truncated at 50 chars — full log available via gh run view 99999]`
    );
  });

  it('should use default logMaxChars of 50_000 when not provided', async () => {
    const shortLog = 'short log output';
    vi.mocked(mockExec).mockResolvedValue({ stdout: shortLog, stderr: '' });

    const result = await service.getFailureLogs('11111', 'feat/branch');

    expect(result).toBe(shortLog);
  });

  it('should throw GitPrError when gh command fails', async () => {
    const execError = new Error('gh: command not found');
    (execError as NodeJS.ErrnoException).code = 'ENOENT';
    vi.mocked(mockExec).mockRejectedValue(execError);

    await expect(service.getFailureLogs('12345', 'feat/branch')).rejects.toThrow(GitPrError);
    await expect(service.getFailureLogs('12345', 'feat/branch')).rejects.toMatchObject({
      code: GitPrErrorCode.GH_NOT_FOUND,
    });
  });

  it('should throw GitPrError with GIT_ERROR on generic gh failure', async () => {
    vi.mocked(mockExec).mockRejectedValue(new Error('gh run view failed: run not found'));

    await expect(service.getFailureLogs('12345', 'feat/branch')).rejects.toMatchObject({
      code: GitPrErrorCode.GIT_ERROR,
    });
  });
});
