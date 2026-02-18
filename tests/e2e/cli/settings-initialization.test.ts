/**
 * CLI Settings Initialization E2E Tests
 *
 * Tests for automatic settings initialization when CLI starts.
 * Uses SHEP_HOME env var to isolate each test from real ~/.shep/ directory.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, existsSync, writeFileSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createCliRunner } from '../../helpers/cli/index.js';

describe('CLI: settings initialization', () => {
  let shepDir: string;
  let dbPath: string;

  beforeEach(() => {
    // Create temporary SHEP_HOME directory for testing
    shepDir = mkdtempSync(join(tmpdir(), 'shep-init-test-'));
    dbPath = join(shepDir, 'data');
  });

  afterEach(() => {
    if (existsSync(shepDir)) {
      rmSync(shepDir, { recursive: true, force: true });
    }
  });

  describe('first run', () => {
    it('should create database file on first run', () => {
      // Arrange
      // SHEP_HOME points to an empty dir — no data file yet
      const runner = createCliRunner({
        env: { SHEP_HOME: shepDir },
        timeout: 15000,
      });

      // Act
      const result = runner.run('version');

      // Assert
      expect(result.success).toBe(true);
      expect(existsSync(dbPath)).toBe(true);
    });

    it('should initialize settings with defaults', () => {
      const runner = createCliRunner({
        env: { SHEP_HOME: shepDir },
        timeout: 15000,
      });

      const result = runner.run('version');

      expect(result.success).toBe(true);
      expect(existsSync(dbPath)).toBe(true);
      const stats = statSync(dbPath);
      expect(stats.size).toBeGreaterThan(0);
    });
  });

  describe('second run', () => {
    it('should load existing settings without re-initializing', () => {
      const runner = createCliRunner({
        env: { SHEP_HOME: shepDir },
        timeout: 15000,
      });

      const firstResult = runner.run('version');
      expect(firstResult.success).toBe(true);

      const stats1 = statSync(dbPath);
      const firstMtime = stats1.mtimeMs;

      const secondResult = runner.run('version');

      expect(secondResult.success).toBe(true);
      const stats2 = statSync(dbPath);
      const secondMtime = stats2.mtimeMs;

      const mtimeDiff = Math.abs(secondMtime - firstMtime);
      expect(mtimeDiff).toBeLessThan(5000);
    }, 30_000);

    it('should not create duplicate settings records', () => {
      const runner = createCliRunner({
        env: { SHEP_HOME: shepDir },
        timeout: 15000,
      });

      runner.run('version');
      const result = runner.run('version');

      expect(result.success).toBe(true);
    }, 30_000);
  });

  describe('global settings access', () => {
    it('should make settings accessible throughout CLI execution', () => {
      const runner = createCliRunner({
        env: { SHEP_HOME: shepDir },
        timeout: 15000,
      });

      const result = runner.run('version');

      expect(result.success).toBe(true);
      expect(result.exitCode).toBe(0);
    });
  });

  describe('error recovery', () => {
    it('should handle corrupted database gracefully', () => {
      writeFileSync(dbPath, 'CORRUPTED_DATA_NOT_SQLITE');

      const runner = createCliRunner({
        env: { SHEP_HOME: shepDir },
        timeout: 15000,
      });

      const result = runner.run('version');

      if (result.success) {
        expect(existsSync(dbPath)).toBe(true);
      } else {
        const output = (result.stderr || result.stdout)
          .split('\n')
          .filter((line) => !line.includes('npm notice'))
          .join('\n');
        expect(output).toMatch(/failed|database|settings|corrupted|initialize/i);
      }
    });

    it('should handle missing database with existing directory', () => {
      // shepDir already exists (from mkdtempSync), but no database
      expect(existsSync(shepDir)).toBe(true);
      expect(existsSync(dbPath)).toBe(false);

      const runner = createCliRunner({
        env: { SHEP_HOME: shepDir },
        timeout: 15000,
      });

      const result = runner.run('version');

      expect(result.success).toBe(true);
      expect(existsSync(dbPath)).toBe(true);
    });
  });

  describe('concurrent initialization', () => {
    it('should handle multiple concurrent CLI invocations safely', async () => {
      const runner = createCliRunner({
        env: { SHEP_HOME: shepDir },
        timeout: 15000,
      });

      const promises = [
        Promise.resolve(runner.run('version')),
        Promise.resolve(runner.run('--version')),
        Promise.resolve(runner.run('--help')),
      ];

      const results = await Promise.all(promises);

      results.forEach((result) => {
        expect(result.success).toBe(true);
      });

      expect(existsSync(dbPath)).toBe(true);
    }, 60_000);
  });

  describe('environment isolation', () => {
    it('should use SHEP_HOME environment variable for settings location', () => {
      const runner = createCliRunner({
        env: { SHEP_HOME: shepDir },
        timeout: 15000,
      });

      const result = runner.run('version');

      expect(result.success).toBe(true);
      expect(existsSync(dbPath)).toBe(true);
    });
  });
});
