/**
 * Log Viewer Unit Tests
 *
 * Tests for the shared log viewing utility.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const mockError = vi.fn();
const mockInfo = vi.fn();

vi.mock('../../../../../src/presentation/cli/ui/index.js', () => ({
  messages: {
    error: (...args: unknown[]) => mockError(...args),
    info: (...args: unknown[]) => mockInfo(...args),
  },
}));

import { viewLog } from '../../../../../src/presentation/cli/commands/log-viewer.js';

describe('viewLog', () => {
  let tmpDir: string;
  let stdoutWriteSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    tmpDir = mkdtempSync(join(tmpdir(), 'log-viewer-test-'));
    stdoutWriteSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    process.exitCode = undefined as any;
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
    stdoutWriteSpy.mockRestore();
  });

  it('returns false and shows error when log file does not exist', async () => {
    const result = await viewLog({
      logPath: join(tmpDir, 'nonexistent.log'),
      lines: 0,
      label: 'test run',
    });

    expect(result).toBe(false);
    expect(mockError).toHaveBeenCalledWith(expect.stringContaining('No log file found'));
    expect(mockInfo).toHaveBeenCalledWith(expect.stringContaining('Expected:'));
  });

  it('returns false and shows info when log file is empty (non-follow)', async () => {
    const logPath = join(tmpDir, 'empty.log');
    writeFileSync(logPath, '');

    const result = await viewLog({
      logPath,
      lines: 0,
      label: 'test run',
    });

    expect(result).toBe(false);
    expect(mockInfo).toHaveBeenCalledWith(expect.stringContaining('empty'));
  });

  it('prints full log content to stdout', async () => {
    const logPath = join(tmpDir, 'full.log');
    writeFileSync(logPath, 'line 1\nline 2\nline 3\n');

    const result = await viewLog({
      logPath,
      lines: 0,
      label: 'test run',
    });

    expect(result).toBe(true);
    const output = stdoutWriteSpy.mock.calls.map((c: unknown[]) => String(c[0])).join('');
    expect(output).toContain('line 1');
    expect(output).toContain('line 2');
    expect(output).toContain('line 3');
  });

  it('prints only last N lines when lines > 0', async () => {
    const logPath = join(tmpDir, 'tail.log');
    writeFileSync(logPath, 'line 1\nline 2\nline 3\nline 4\nline 5\n');

    const result = await viewLog({
      logPath,
      lines: 2,
      label: 'test run',
    });

    expect(result).toBe(true);
    const output = stdoutWriteSpy.mock.calls.map((c: unknown[]) => String(c[0])).join('');
    expect(output).toContain('line 5');
    expect(output).not.toContain('line 1');
    expect(output).not.toContain('line 2');
  });

  it('prints last N lines from a large file (> 64KB)', async () => {
    const logPath = join(tmpDir, 'large.log');
    // Generate a file > 64KB
    const lines: string[] = [];
    for (let i = 0; i < 2000; i++) {
      lines.push(`log entry ${i}: ${'x'.repeat(40)}`);
    }
    writeFileSync(logPath, `${lines.join('\n')}\n`);

    const result = await viewLog({
      logPath,
      lines: 3,
      label: 'test run',
    });

    expect(result).toBe(true);
    const output = stdoutWriteSpy.mock.calls.map((c: unknown[]) => String(c[0])).join('');
    expect(output).toContain('log entry 1999');
    expect(output).not.toContain('log entry 0:');
  });
});
