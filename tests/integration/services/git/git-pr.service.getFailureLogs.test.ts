/**
 * GitPrService.getFailureLogs Integration Tests
 *
 * Validates the full flow from gh CLI invocation through log truncation
 * and error propagation using a mocked execFile that simulates realistic
 * gh run view --log-failed output formats.
 *
 * Complements the unit tests in tests/unit/infrastructure/services/git/
 * by exercising the complete GitPrService instance with representative
 * CI log content rather than synthetic strings.
 */

import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GitPrService } from '../../../../packages/core/src/infrastructure/services/git/git-pr.service.js';
import {
  GitPrError,
  GitPrErrorCode,
} from '../../../../packages/core/src/application/ports/output/services/git-pr-service.interface.js';
import type { ExecFunction } from '../../../../packages/core/src/infrastructure/services/git/worktree.service.js';

vi.mock('node:fs', async () => {
  const actual = await vi.importActual<object>('node:fs');
  return { ...actual, readFileSync: vi.fn() };
});

// Representative CI failure log lines (realistic gh run view --log-failed output)
const REALISTIC_TYPECHECK_FAILURE = `
2024-01-15T10:22:31.1234567Z ##[group]Run pnpm typecheck
2024-01-15T10:22:31.1234567Z pnpm typecheck
2024-01-15T10:22:31.1234567Z shell: /usr/bin/bash -e {0}
2024-01-15T10:22:31.1234567Z ##[endgroup]
2024-01-15T10:22:45.1234567Z src/infrastructure/services/agents/feature-agent/nodes/merge.node.ts(47,18): error TS2339: Property 'ciFixAttempts' does not exist on type 'FeatureAgentState'.
2024-01-15T10:22:45.1234567Z src/infrastructure/services/agents/feature-agent/nodes/merge.node.ts(89,5): error TS2345: Argument of type 'string' is not assignable to parameter of type 'never'.
2024-01-15T10:22:45.1234567Z Found 2 errors in 1 file.
2024-01-15T10:22:45.1234567Z ##[error]Process completed with exit code 1.
`.trim();

const REALISTIC_LINT_FAILURE = `
2024-01-15T10:22:31.1234567Z ##[group]Run pnpm lint
2024-01-15T10:22:31.1234567Z pnpm lint
2024-01-15T10:22:31.1234567Z ##[endgroup]
2024-01-15T10:22:45.1234567Z /home/runner/work/shep/shep/packages/core/src/domain/generated/output.ts
2024-01-15T10:22:45.1234567Z   47:1  error  'CiFixRecord' is defined but never used  @typescript-eslint/no-unused-vars
2024-01-15T10:22:45.1234567Z ✖ 1 problem (1 error, 0 warnings)
2024-01-15T10:22:45.1234567Z ##[error]Process completed with exit code 1.
`.trim();

describe('GitPrService.getFailureLogs (integration)', () => {
  let mockExec: ExecFunction;
  let service: GitPrService;

  beforeEach(() => {
    mockExec = vi.fn();
    service = new GitPrService(mockExec);
  });

  describe('gh command invocation', () => {
    it('calls gh with run view <runId> --log-failed and no cwd', async () => {
      vi.mocked(mockExec).mockResolvedValue({ stdout: REALISTIC_TYPECHECK_FAILURE, stderr: '' });

      await service.getFailureLogs('9876543210', 'feat/ci-watch-fix-loop');

      expect(mockExec).toHaveBeenCalledOnce();
      expect(mockExec).toHaveBeenCalledWith('gh', ['run', 'view', '9876543210', '--log-failed'], {
        cwd: undefined,
      });
    });

    it('passes the exact runId string to the gh command without modification', async () => {
      vi.mocked(mockExec).mockResolvedValue({ stdout: '', stderr: '' });
      const runId = '1234567890987654321';

      await service.getFailureLogs(runId, 'main');

      const callArgs = vi.mocked(mockExec).mock.calls[0];
      expect(callArgs[1]).toContain(runId);
      expect(callArgs[1][2]).toBe(runId);
    });
  });

  describe('log passthrough — output within limit', () => {
    it('returns full realistic typecheck failure log without truncation', async () => {
      vi.mocked(mockExec).mockResolvedValue({
        stdout: REALISTIC_TYPECHECK_FAILURE,
        stderr: '',
      });

      const result = await service.getFailureLogs('9876543210', 'feat/branch');

      expect(result).toBe(REALISTIC_TYPECHECK_FAILURE);
      expect(result).not.toContain('[Log truncated');
    });

    it('returns full realistic lint failure log without truncation', async () => {
      vi.mocked(mockExec).mockResolvedValue({
        stdout: REALISTIC_LINT_FAILURE,
        stderr: '',
      });

      const result = await service.getFailureLogs('1122334455', 'feat/branch');

      expect(result).toBe(REALISTIC_LINT_FAILURE);
      expect(result).not.toContain('[Log truncated');
    });

    it('returns empty string when gh exits with code 0 and no output', async () => {
      vi.mocked(mockExec).mockResolvedValue({ stdout: '', stderr: '' });

      const result = await service.getFailureLogs('5544332211', 'feat/no-failures');

      expect(result).toBe('');
    });
  });

  describe('log truncation — output exceeds limit', () => {
    it('truncates output exceeding 50_000 chars and appends correct notice', async () => {
      // Generate a realistic-looking log that exceeds 50_000 chars
      const singleLine =
        '2024-01-15T10:22:45.1234567Z   at Object.test (/repo/tests/unit/some.test.ts:42:5)\n';
      const repeats = Math.ceil(51_000 / singleLine.length);
      const longLog = singleLine.repeat(repeats);
      expect(longLog.length).toBeGreaterThan(50_000);

      vi.mocked(mockExec).mockResolvedValue({ stdout: longLog, stderr: '' });

      const result = await service.getFailureLogs('7788990011', 'feat/flaky-tests');

      expect(result.length).toBeGreaterThan(50_000); // includes the notice
      expect(result.startsWith(longLog.slice(0, 50_000))).toBe(true);
      expect(result).toContain(
        '\n[Log truncated at 50000 chars — full log available via gh run view 7788990011]'
      );
    });

    it('respects a custom logMaxChars override', async () => {
      const log = 'X'.repeat(200);
      vi.mocked(mockExec).mockResolvedValue({ stdout: log, stderr: '' });

      const result = await service.getFailureLogs('1234567890', 'feat/branch', 100);

      expect(result).toBe(
        `${'X'.repeat(
          100
        )}\n[Log truncated at 100 chars — full log available via gh run view 1234567890]`
      );
    });

    it('does not truncate when output length equals the limit exactly', async () => {
      const log = 'A'.repeat(50_000);
      vi.mocked(mockExec).mockResolvedValue({ stdout: log, stderr: '' });

      const result = await service.getFailureLogs('9999999999', 'feat/exact');

      expect(result).toBe(log);
      expect(result).not.toContain('[Log truncated');
    });
  });

  describe('error propagation', () => {
    it('throws GitPrError with GH_NOT_FOUND when gh binary is not installed', async () => {
      const notFoundError = new Error('spawn gh ENOENT');
      (notFoundError as NodeJS.ErrnoException).code = 'ENOENT';
      vi.mocked(mockExec).mockRejectedValue(notFoundError);

      await expect(service.getFailureLogs('9876543210', 'feat/branch')).rejects.toThrow(GitPrError);

      await expect(service.getFailureLogs('9876543210', 'feat/branch')).rejects.toMatchObject({
        code: GitPrErrorCode.GH_NOT_FOUND,
      });
    });

    it('throws GitPrError with GIT_ERROR when gh exits with non-zero code (run not found)', async () => {
      const execError = new Error(
        'Command failed: gh run view 9876543210 --log-failed\nError: no run found for ID 9876543210'
      );
      vi.mocked(mockExec).mockRejectedValue(execError);

      await expect(service.getFailureLogs('9876543210', 'feat/branch')).rejects.toMatchObject({
        code: GitPrErrorCode.GIT_ERROR,
      });
    });

    it('wraps the original error as the cause on gh failure', async () => {
      const originalError = new Error('gh: command failed with exit code 1');
      vi.mocked(mockExec).mockRejectedValue(originalError);

      let thrown: GitPrError | undefined;
      try {
        await service.getFailureLogs('12345', 'feat/branch');
      } catch (e) {
        thrown = e as GitPrError;
      }

      expect(thrown).toBeInstanceOf(GitPrError);
      expect(thrown?.cause).toBe(originalError);
    });
  });
});
