/**
 * CLI Feature Commands E2E Tests
 *
 * Tests for the `shep feat` command group (new, ls, show).
 * Verifies feature creation with git worktrees, listing, and detail display.
 *
 * Each test uses an isolated HOME directory (for settings/database)
 * and a temporary git repository (for worktree creation).
 *
 * NOTE: Uses execSync intentionally for git setup in tests. All inputs are
 * controlled by test code, not user input, so command injection is not a risk.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { execSync } from 'node:child_process';
import { createCliRunner } from '../../helpers/cli/index.js';

describe('CLI: feat', () => {
  let tempHome: string;
  let tempRepo: string;

  beforeEach(() => {
    // Create isolated HOME directory for settings/database
    tempHome = mkdtempSync(join(tmpdir(), 'shep-feat-test-home-'));

    // Create temporary git repository with an initial commit
    // (git worktree requires at least one commit)
    tempRepo = mkdtempSync(join(tmpdir(), 'shep-feat-test-repo-'));
    // Security: all execSync inputs are hardcoded test constants, not user input
    execSync('git init', { cwd: tempRepo, stdio: 'pipe' });
    execSync('git config user.name "Test User"', { cwd: tempRepo, stdio: 'pipe' });
    execSync('git config user.email "test@example.com"', { cwd: tempRepo, stdio: 'pipe' });
    execSync('git commit --allow-empty -m "Initial commit"', { cwd: tempRepo, stdio: 'pipe' });
  });

  afterEach(() => {
    // Clean up temporary directories
    if (existsSync(tempHome)) {
      rmSync(tempHome, { recursive: true, force: true });
    }
    if (existsSync(tempRepo)) {
      rmSync(tempRepo, { recursive: true, force: true });
    }
  });

  /**
   * Extract feature ID (UUID) from `feat new` output.
   * Output format: "  ID:     <uuid>"
   */
  function extractFeatureId(output: string): string {
    const match = output.match(/ID:\s+([0-9a-f-]{36})/);
    if (!match) {
      throw new Error(`Could not extract feature ID from output:\n${output}`);
    }
    return match[1];
  }

  describe('shep feat new', () => {
    it('should create a feature and display its details', () => {
      const runner = createCliRunner({
        env: { HOME: tempHome },
        timeout: 30000,
      });

      const result = runner.run(`feat new "Add user authentication" --repo ${tempRepo}`);

      expect(result.success).toBe(true);
      expect(result.stdout).toContain('Feature created');
      expect(result.stdout).toMatch(/ID:\s+[0-9a-f-]{36}/);
      expect(result.stdout).toContain('feat/add-user-authentication');
      expect(result.stdout).toContain('Requirements');
    });

    it('should create a git worktree for the feature branch', () => {
      const runner = createCliRunner({
        env: { HOME: tempHome },
        timeout: 30000,
      });

      runner.runOrThrow(`feat new "Worktree check" --repo ${tempRepo}`);

      // Worktrees are stored at ~/.shep/repos/REPO_HASH/wt/FEATURE-SLUG
      const repoHash = createHash('sha256').update(tempRepo).digest('hex').slice(0, 16);
      const worktreePath = join(tempHome, '.shep', 'repos', repoHash, 'wt', 'feat-worktree-check');
      expect(existsSync(worktreePath)).toBe(true);
    });

    it('should reject duplicate feature slugs', () => {
      const runner = createCliRunner({
        env: { HOME: tempHome },
        timeout: 30000,
      });

      const first = runner.run(`feat new "Duplicate test" --repo ${tempRepo}`);
      expect(first.success).toBe(true);

      const second = runner.run(`feat new "Duplicate test" --repo ${tempRepo}`);
      expect(second.success).toBe(false);
      // Error message goes to stderr via messages.error + console.error
      const output = `${second.stdout} ${second.stderr}`;
      expect(output).toMatch(/already exists/i);
    });

    it('should show error when no description is provided', () => {
      const runner = createCliRunner({
        env: { HOME: tempHome },
        timeout: 30000,
      });

      const result = runner.run('feat new');

      expect(result.success).toBe(false);
    });
  });

  describe('shep feat ls', () => {
    it('should show message when no features exist', () => {
      const runner = createCliRunner({
        env: { HOME: tempHome },
        timeout: 30000,
      });

      const result = runner.run('feat ls');

      expect(result.success).toBe(true);
      expect(result.stdout).toMatch(/no features/i);
    });

    it('should list created features', () => {
      const runner = createCliRunner({
        env: { HOME: tempHome },
        timeout: 30000,
      });

      runner.runOrThrow(`feat new "Listed feature" --repo ${tempRepo}`);

      const result = runner.run('feat ls');

      expect(result.success).toBe(true);
      expect(result.stdout).toContain('Features');
      expect(result.stdout).toContain('Listed feature');
    });

    it('should filter features by repository path', () => {
      const runner = createCliRunner({
        env: { HOME: tempHome },
        timeout: 30000,
      });

      runner.runOrThrow(`feat new "Repo filter test" --repo ${tempRepo}`);

      const result = runner.run(`feat ls --repo ${tempRepo}`);

      expect(result.success).toBe(true);
      expect(result.stdout).toContain('Repo filter test');
    });
  });

  describe('shep feat show', () => {
    it('should display feature details', () => {
      const runner = createCliRunner({
        env: { HOME: tempHome },
        timeout: 30000,
      });

      const createResult = runner.runOrThrow(`feat new "Show detail test" --repo ${tempRepo}`);
      const featureId = extractFeatureId(createResult.stdout);

      const result = runner.run(`feat show ${featureId}`);

      expect(result.success).toBe(true);
      expect(result.stdout).toContain(featureId);
      expect(result.stdout).toContain('Show detail test');
      expect(result.stdout).toContain('feat/show-detail-test');
      expect(result.stdout).toContain('Requirements');
      expect(result.stdout).toContain(tempRepo);
    });

    it('should show error for nonexistent feature ID', () => {
      const runner = createCliRunner({
        env: { HOME: tempHome },
        timeout: 30000,
      });

      const result = runner.run('feat show nonexistent-id');

      expect(result.success).toBe(false);
      const output = `${result.stdout} ${result.stderr}`;
      expect(output).toMatch(/not found|failed/i);
    });
  });
});
