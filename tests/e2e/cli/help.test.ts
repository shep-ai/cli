/**
 * CLI Help Command E2E Tests
 *
 * Tests for the `shep --help`, `shep -h`, and related flags.
 *
 * NOTE: `shep` (no args) no longer prints help — it starts the web UI daemon
 * (or runs onboarding on first run). The default help output is now only
 * accessible via `shep --help` or `shep -h`.
 */

import { describe, it, expect, afterAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { runCli, createIsolatedCliRunner } from '../../helpers/cli/index.js';

describe('CLI: help', () => {
  it('should display help with --help flag', () => {
    const result = runCli('--help');

    expect(result.success).toBe(true);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Usage:');
    expect(result.stdout).toContain('shep');
    expect(result.stdout).toContain('version');
    expect(result.stdout).toContain('Display version information');
    expect(result.stdout).toContain('-v, --version');
    expect(result.stdout).toContain('-h, --help');
  });

  describe('shep (no args) starts the daemon instead of printing help', () => {
    // The default action is now startDaemon(), not outputHelp().
    // In a non-TTY test environment, onboarding is skipped and the daemon spawns.
    // Skip readiness check since the daemon child can't start a real server in E2E.
    const { runner, shepHome, cleanup } = createIsolatedCliRunner({
      env: { SHEP_SKIP_READINESS_CHECK: '1' },
    });

    afterAll(() => {
      // Kill the spawned daemon if it is still alive
      try {
        const daemonPath = join(shepHome, 'daemon.json');
        const state = JSON.parse(readFileSync(daemonPath, 'utf-8'));
        try {
          process.kill(-state.pid, 'SIGKILL');
        } catch {
          try {
            process.kill(state.pid, 'SIGKILL');
          } catch {
            // Already dead
          }
        }
      } catch {
        // No daemon.json or already dead — OK
      }
      cleanup();
    });

    it('exits 0 and does not print help', () => {
      const result = runner.run('');

      expect(result.exitCode).toBe(0);
      expect(result.success).toBe(true);
      // Daemon start output contains the server URL, not a "Usage:" banner
      expect(result.stdout).not.toContain('Usage:');
    });
  });

  it('should display help with -h short flag', () => {
    const result = runCli('-h');

    expect(result.success).toBe(true);
    expect(result.stdout).toContain('Usage:');
  });

  it('should treat help as unknown subcommand', () => {
    const result = runCli('help version');

    expect(result.success).toBe(false);
  });

  it('should display version command help with version --help', () => {
    const result = runCli('version --help');

    expect(result.success).toBe(true);
    expect(result.stdout).toContain('version');
    expect(result.stdout).toContain('Display version information');
  });
});
