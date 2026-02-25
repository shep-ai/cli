/**
 * Daemon Lifecycle E2E Tests
 *
 * Tests for the `shep start`, `shep stop`, and `shep status` commands.
 *
 * Test strategy:
 *  - "No daemon" tests: clean SHEP_HOME, verify not-running messages
 *  - "shep start" tests: verify exit code, stdout URL, daemon.json shape, parent exit time
 *  - "Alive daemon" tests: use a long-running `sleep` process to simulate an alive daemon
 *    without requiring the Next.js web server to be built; verifies status display,
 *    idempotent start, stop lifecycle, and post-stop not-running state
 *
 * Each test group gets its own isolated SHEP_HOME temp directory.
 *
 * Note: Run via `pnpm test:e2e:cli` which sets SHEP_E2E_USE_DIST=1 and builds the CLI.
 * The tests work in both tsx and dist modes because:
 *  - The "alive daemon" tests write daemon.json manually (no real spawn dependency)
 *  - The "shep start" tests verify parent behavior (exit code, output, daemon.json)
 *    which works regardless of whether the spawned daemon stays alive
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { readFile, access } from 'node:fs/promises';
import { constants } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createCliRunner } from '../../helpers/cli/runner.js';

// These tests involve process spawning and signal delivery — use a generous timeout
const TEST_TIMEOUT = 30_000;

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Create an isolated temp SHEP_HOME directory.
 * Returns the path and a cleanup function.
 */
function makeTempShepHome(): { shepHome: string; cleanup: () => void } {
  const shepHome = mkdtempSync(join(tmpdir(), 'shep-e2e-daemon-'));
  return {
    shepHome,
    cleanup: () => {
      try {
        rmSync(shepHome, { recursive: true, force: true });
      } catch {
        // best-effort cleanup
      }
    },
  };
}

/** Returns true if daemon.json exists in the given SHEP_HOME. */
async function daemonJsonExists(shepHome: string): Promise<boolean> {
  const daemonPath = join(shepHome, 'daemon.json');
  try {
    await access(daemonPath, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

/** Read and parse daemon.json from the given SHEP_HOME. */
async function readDaemonJson(
  shepHome: string
): Promise<{ pid: number; port: number; startedAt: string }> {
  const daemonPath = join(shepHome, 'daemon.json');
  const content = await readFile(daemonPath, 'utf-8');
  return JSON.parse(content) as { pid: number; port: number; startedAt: string };
}

/** Write a daemon.json directly to SHEP_HOME (simulates a running daemon). */
function writeDaemonJson(shepHome: string, pid: number, port: number): void {
  const daemonPath = join(shepHome, 'daemon.json');
  writeFileSync(
    daemonPath,
    JSON.stringify({ pid, port, startedAt: new Date().toISOString() }),
    'utf-8'
  );
}

// ─── Test suites ─────────────────────────────────────────────────────────────

describe('CLI: daemon lifecycle', { timeout: TEST_TIMEOUT }, () => {
  // ── 1. No daemon running ─────────────────────────────────────────────────
  describe('no daemon running', () => {
    let shepHome: string;
    let cleanup: () => void;
    let runCli: ReturnType<typeof createCliRunner>['run'];

    beforeAll(() => {
      const temp = makeTempShepHome();
      shepHome = temp.shepHome;
      cleanup = temp.cleanup;
      runCli = createCliRunner({ env: { SHEP_HOME: shepHome } }).run;
    });

    afterAll(() => cleanup());

    it('shep stop exits 0 and prints a "no daemon" message', () => {
      const result = runCli('stop');
      expect(result.exitCode).toBe(0);
      expect(result.success).toBe(true);
      const output = `${result.stdout} ${result.stderr}`.toLowerCase();
      expect(output).toMatch(/no shep daemon/);
    });

    it('shep status exits 0 and prints a "not running" message with a shep-start hint', () => {
      const result = runCli('status');
      expect(result.exitCode).toBe(0);
      expect(result.success).toBe(true);
      const output = `${result.stdout} ${result.stderr}`;
      expect(output).toMatch(/not running/i);
      expect(output).toMatch(/shep start/i);
    });
  });

  // ── 2. shep start behavior ───────────────────────────────────────────────
  describe('shep start', () => {
    let shepHome: string;
    let cleanup: () => void;
    let runCli: ReturnType<typeof createCliRunner>['run'];

    beforeAll(() => {
      const temp = makeTempShepHome();
      shepHome = temp.shepHome;
      cleanup = temp.cleanup;
      runCli = createCliRunner({ env: { SHEP_HOME: shepHome } }).run;
    });

    afterAll(async () => {
      // Best-effort: kill the spawned daemon if it is still alive
      if (await daemonJsonExists(shepHome)) {
        try {
          const state = await readDaemonJson(shepHome);
          process.kill(state.pid, 'SIGKILL');
        } catch {
          // Already dead — OK
        }
      }
      cleanup();
    });

    it('exits 0 and prints a localhost URL', () => {
      const startMs = Date.now();
      const result = runCli('start');
      const elapsed = Date.now() - startMs;

      expect(result.exitCode).toBe(0);
      expect(result.success).toBe(true);
      // URL should appear somewhere in the combined output
      expect(result.stdout + result.stderr).toMatch(/localhost:\d+/);
      // Parent must exit quickly — proxy for NFR-1 (parent-exits-within-2s)
      expect(elapsed).toBeLessThan(5000);
    });

    it('writes daemon.json with the correct shape', async () => {
      const exists = await daemonJsonExists(shepHome);
      expect(exists).toBe(true);

      const state = await readDaemonJson(shepHome);
      // Shape: { pid: number, port: number, startedAt: ISO 8601 string }
      expect(typeof state.pid).toBe('number');
      expect(typeof state.port).toBe('number');
      expect(typeof state.startedAt).toBe('string');
      expect(state.pid).toBeGreaterThan(0);
      expect(state.port).toBeGreaterThanOrEqual(1024);
      expect(state.port).toBeLessThanOrEqual(65535);
      // startedAt must be a valid ISO 8601 timestamp
      expect(state.startedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });
  });

  // ── 3. Alive daemon (simulated via sleep process) ────────────────────────
  //
  // Rather than depending on the Next.js web server being fully built and
  // running, we spawn a long-running `sleep` process, write its PID to
  // daemon.json, and then exercise the CLI commands against it.
  // This validates all command behaviors without a web-server dependency.
  describe('alive daemon simulation', () => {
    let shepHome: string;
    let cleanup: () => void;
    let runCli: ReturnType<typeof createCliRunner>['run'];
    let fakeProcess: ReturnType<typeof spawn>;
    const fakePort = 4051;

    beforeAll(async () => {
      const temp = makeTempShepHome();
      shepHome = temp.shepHome;
      cleanup = temp.cleanup;
      runCli = createCliRunner({ env: { SHEP_HOME: shepHome } }).run;

      // Spawn a harmless long-running process to act as our fake daemon
      fakeProcess = spawn('sleep', ['60'], { detached: true, stdio: 'ignore' });
      fakeProcess.unref();

      // Populate daemon.json as if `shep start` had run
      writeDaemonJson(shepHome, fakeProcess.pid!, fakePort);
    });

    afterAll(() => {
      // Kill the fake process if it is still alive
      try {
        if (fakeProcess?.pid) process.kill(fakeProcess.pid, 'SIGKILL');
      } catch {
        // Already dead — OK
      }
      cleanup();
    });

    it('shep status exits 0 and displays PID and port', () => {
      const result = runCli('status');
      expect(result.exitCode).toBe(0);
      expect(result.success).toBe(true);
      const output = result.stdout + result.stderr;
      expect(output).toContain(String(fakeProcess.pid));
      expect(output).toContain(String(fakePort));
    });

    it('shep start is idempotent — exits 0 and prints "already running"', () => {
      const result = runCli('start');
      expect(result.exitCode).toBe(0);
      expect(result.success).toBe(true);
      const output = (result.stdout + result.stderr).toLowerCase();
      expect(output).toMatch(/already running/);
    });

    it('shep stop exits 0 and deletes daemon.json', async () => {
      const result = runCli('stop');
      expect(result.exitCode).toBe(0);
      expect(result.success).toBe(true);

      // daemon.json must be removed after a successful stop
      const exists = await daemonJsonExists(shepHome);
      expect(exists).toBe(false);
    });

    it('shep status shows "not running" after stop', () => {
      // daemon.json was deleted by the previous test — status should now reflect that
      const result = runCli('status');
      expect(result.exitCode).toBe(0);
      const output = result.stdout + result.stderr;
      expect(output).toMatch(/not running/i);
    });
  });
});
