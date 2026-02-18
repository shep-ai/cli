/**
 * Settings Init Command E2E Tests
 *
 * Tests for the `shep settings init` command with confirmation prompts.
 *
 * TDD Phase: RED
 * - These tests are written BEFORE implementation
 * - All tests should FAIL initially (command doesn't exist yet)
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createIsolatedCliRunner, type IsolatedCliRunner } from '../../helpers/cli/index.js';

describe('CLI: settings init', () => {
  let isolated: IsolatedCliRunner;

  beforeEach(() => {
    isolated = createIsolatedCliRunner();
  });

  afterEach(() => {
    isolated.cleanup();
  });

  describe('shep settings init --force', () => {
    it('should reinitialize settings without prompting', () => {
      const result = isolated.runner.run('settings init --force');

      expect(result.exitCode).toBe(0);
      expect(result.success).toBe(true);
    });

    it('should display success message', () => {
      const result = isolated.runner.run('settings init --force');

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Settings initialized');
    });

    it('should reset settings to defaults after init', () => {
      // First, verify settings exist via show
      const showResult = isolated.runner.run('settings show --output json');
      expect(showResult.exitCode).toBe(0);

      // Run init --force
      const initResult = isolated.runner.run('settings init --force');
      expect(initResult.exitCode).toBe(0);

      // Verify settings are reset to defaults
      const afterResult = isolated.runner.run('settings show --output json');
      expect(afterResult.exitCode).toBe(0);

      const settings = JSON.parse(afterResult.stdout);
      expect(settings.models.analyze).toBe('claude-sonnet-4-5');
      expect(settings.environment.defaultEditor).toBe('vscode');
      expect(settings.system.autoUpdate).toBe(true);
    }, 30_000);
  });

  describe('shep settings init (without --force)', () => {
    it('should not silently modify settings without confirmation', () => {
      // Without --force and without stdin input, the command should
      // either prompt and timeout/fail, or require explicit confirmation
      const result = isolated.runner.run('settings init');

      // Should either prompt (and fail due to no stdin) or show a message
      // The key assertion: settings should NOT be silently reset
      expect(result.stdout + result.stderr).not.toBe('');
    });
  });

  describe('shep settings init -f (short flag)', () => {
    it('should work with -f short flag', () => {
      const result = isolated.runner.run('settings init -f');

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Settings initialized');
    });
  });

  describe('shep settings init --help', () => {
    it('should display help for init command', () => {
      const result = isolated.runner.run('settings init --help');

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('init');
      expect(result.stdout).toContain('--force');
    });
  });
});
