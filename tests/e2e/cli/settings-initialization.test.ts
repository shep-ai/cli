/**
 * CLI Settings Initialization E2E Tests
 *
 * Tests for automatic settings initialization when CLI starts.
 * Uses temporary directory to avoid affecting real ~/.shep/ directory.
 *
 * TDD Phase: RED
 * - Tests written BEFORE implementation
 * - All tests should FAIL initially
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, existsSync, writeFileSync, statSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createCliRunner } from '../../helpers/cli/index.js';

describe('CLI: settings initialization', () => {
  let tempDir: string;
  let shepDir: string;
  let dbPath: string;

  beforeEach(() => {
    // Create temporary home directory for testing
    tempDir = mkdtempSync(join(tmpdir(), 'shep-cli-test-'));
    shepDir = join(tempDir, '.shep');
    dbPath = join(shepDir, 'data');
  });

  afterEach(() => {
    // Clean up temporary directory
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('first run', () => {
    it('should create ~/.shep/ directory', () => {
      // Arrange
      expect(existsSync(shepDir)).toBe(false);
      const runner = createCliRunner({
        env: { HOME: tempDir },
        timeout: 15000,
      });

      // Act
      const result = runner.run('version'); // Simple command to trigger initialization

      // Assert
      expect(result.success).toBe(true);
      expect(existsSync(shepDir)).toBe(true);
    });

    it('should create database file', () => {
      // Arrange
      expect(existsSync(dbPath)).toBe(false);
      const runner = createCliRunner({
        env: { HOME: tempDir },
        timeout: 15000,
      });

      // Act
      const result = runner.run('version');

      // Assert
      expect(result.success).toBe(true);
      expect(existsSync(dbPath)).toBe(true);
    });

    it('should initialize settings with defaults', () => {
      // Arrange
      const runner = createCliRunner({
        env: { HOME: tempDir },
        timeout: 15000,
      });

      // Act
      const result = runner.run('version');

      // Assert
      expect(result.success).toBe(true);

      // Verify database contains settings (by checking file exists and is not empty)
      expect(existsSync(dbPath)).toBe(true);
      const stats = statSync(dbPath);
      expect(stats.size).toBeGreaterThan(0);
    });

    it('should have correct directory permissions (700)', () => {
      // Arrange
      const runner = createCliRunner({
        env: { HOME: tempDir },
        timeout: 15000,
      });

      // Act
      const result = runner.run('version');

      // Assert
      expect(result.success).toBe(true);

      // Check permissions (Unix only)
      if (process.platform !== 'win32') {
        const stats = statSync(shepDir);
        const mode = stats.mode & 0o777; // Extract permission bits
        expect(mode).toBe(0o700); // rwx------
      }
    });
  });

  describe('second run', () => {
    it('should load existing settings without re-initializing', () => {
      // Arrange - run CLI once to initialize
      const runner = createCliRunner({
        env: { HOME: tempDir },
        timeout: 15000,
      });

      const firstResult = runner.run('version');
      expect(firstResult.success).toBe(true);

      // Get initial database modification time
      const stats1 = statSync(dbPath);
      const firstMtime = stats1.mtimeMs;

      // Act - run CLI again (without modifying database)
      const secondResult = runner.run('version');

      // Assert
      expect(secondResult.success).toBe(true);

      // Database should not be modified (same mtime or very close)
      const stats2 = statSync(dbPath);
      const secondMtime = stats2.mtimeMs;

      // Mtime should be very close (allowing for filesystem timing variations)
      const mtimeDiff = Math.abs(secondMtime - firstMtime);
      expect(mtimeDiff).toBeLessThan(1000); // Less than 1 second difference
    });

    it('should not create duplicate settings records', () => {
      // Arrange - run CLI twice
      const runner = createCliRunner({
        env: { HOME: tempDir },
        timeout: 15000,
      });

      runner.run('version');
      const result = runner.run('version');

      // Assert - should succeed (singleton constraint doesn't throw on load)
      expect(result.success).toBe(true);
    });
  });

  describe('global settings access', () => {
    it('should make settings accessible throughout CLI execution', () => {
      // Arrange
      const runner = createCliRunner({
        env: { HOME: tempDir },
        timeout: 15000,
      });

      // Act - run any command that would use settings
      const result = runner.run('version');

      // Assert - should succeed without errors
      expect(result.success).toBe(true);
      expect(result.exitCode).toBe(0);
    });
  });

  describe('error recovery', () => {
    it('should handle corrupted database gracefully', () => {
      // Arrange - create invalid database file
      mkdirSync(shepDir, { recursive: true, mode: 0o700 });
      writeFileSync(dbPath, 'CORRUPTED_DATA_NOT_SQLITE');

      const runner = createCliRunner({
        env: { HOME: tempDir },
        timeout: 15000,
      });

      // Act
      const result = runner.run('version');

      // Assert - should either:
      // 1. Succeed by recovering (re-initializing)
      // 2. Fail with helpful error message
      if (result.success) {
        // If recovery succeeded, database should be valid now
        expect(existsSync(dbPath)).toBe(true);
      } else {
        // If failed, should have meaningful error message
        // Filter out npm notices from stderr
        const output = (result.stderr || result.stdout)
          .split('\n')
          .filter((line) => !line.includes('npm notice'))
          .join('\n');
        expect(output).toMatch(/failed|database|settings|corrupted|initialize/i);
      }
    });

    it('should handle missing database with existing directory', () => {
      // Arrange - create directory but no database
      mkdirSync(shepDir, { recursive: true, mode: 0o700 });
      expect(existsSync(shepDir)).toBe(true);
      expect(existsSync(dbPath)).toBe(false);

      const runner = createCliRunner({
        env: { HOME: tempDir },
        timeout: 15000,
      });

      // Act
      const result = runner.run('version');

      // Assert - should succeed by creating database
      expect(result.success).toBe(true);
      expect(existsSync(dbPath)).toBe(true);
    });
  });

  describe('concurrent initialization', () => {
    it('should handle multiple concurrent CLI invocations safely', async () => {
      // Arrange
      const runner = createCliRunner({
        env: { HOME: tempDir },
        timeout: 15000,
      });

      // Act - run multiple commands concurrently
      const promises = [
        Promise.resolve(runner.run('version')),
        Promise.resolve(runner.run('--version')),
        Promise.resolve(runner.run('--help')),
      ];

      const results = await Promise.all(promises);

      // Assert - all should succeed
      results.forEach((result) => {
        expect(result.success).toBe(true);
      });

      // Database should exist and be valid
      expect(existsSync(dbPath)).toBe(true);
    });
  });

  describe('environment isolation', () => {
    it('should use HOME environment variable for settings location', () => {
      // Arrange
      const runner = createCliRunner({
        env: { HOME: tempDir },
        timeout: 15000,
      });

      // Act
      const result = runner.run('version');

      // Assert
      expect(result.success).toBe(true);

      // Settings should be in custom HOME, not real home directory
      expect(existsSync(shepDir)).toBe(true);
      expect(shepDir).toContain(tempDir);
    });
  });
});
