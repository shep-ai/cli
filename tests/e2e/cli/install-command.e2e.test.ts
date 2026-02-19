/**
 * CLI Install Command E2E Tests
 *
 * Tests for the `shep install` command covering:
 * - Help text display
 * - Installation instructions (--how flag)
 * - Unknown tool handling
 * - All 7 supported tools
 *
 * Tests focus on the --how flag since it has no side effects.
 * Actual installation is covered by unit/integration tests.
 */

import { describe, it, expect } from 'vitest';
import { runCli, runCliAsync } from '../../helpers/cli/index.js';

describe('CLI: install command', () => {
  it('should display help text', () => {
    const result = runCli('install --help');
    expect(result.success).toBe(true);
    expect(result.stdout).toContain('Install a development tool');
    expect(result.stdout).toContain('[tool]');
    expect(result.stdout).toContain('--how');
  });

  describe('shep install <tool> --how', () => {
    it.concurrent('should print installation instructions for vscode', async () => {
      const result = await runCliAsync('install vscode --how');
      expect(result.success).toBe(true);
      expect(result.stdout).toContain('Installation Instructions for Visual Studio Code');
      expect(result.stdout).toContain('Binary:');
      expect(result.stdout).toContain('code');
      expect(result.stdout).toContain('Installation Commands');
      expect(result.stdout).toContain('Documentation');
      expect(result.stdout).toContain('https://');
      expect(result.stdout).toContain('Verify Installation');
      expect(result.stdout).toContain('--version');
      expect(result.stdout).toContain('Lightweight but powerful source code editor');
      expect(result.stdout).toMatch(/\[(linux|darwin)\]/);
      expect(result.stdout).toMatch(/Binary:\s+\w+/);
    });

    it.concurrent('should print installation instructions for cursor', async () => {
      const result = await runCliAsync('install cursor --how');
      expect(result.success).toBe(true);
      expect(result.stdout).toContain('Installation Instructions for Cursor');
      expect(result.stdout).toContain('Binary:');
      expect(result.stdout).toContain('cursor');
      expect(result.stdout).toMatch(/Binary:\s+\w+/);
    });

    it.concurrent('should print installation instructions for windsurf', async () => {
      const result = await runCliAsync('install windsurf --how');
      expect(result.success).toBe(true);
      expect(result.stdout).toContain('Installation Instructions for Windsurf');
      expect(result.stdout).toContain('Binary:');
      expect(result.stdout).toContain('windsurf');
      expect(result.stdout).toMatch(/Binary:\s+\w+/);
    });

    it.concurrent('should print installation instructions for zed', async () => {
      const result = await runCliAsync('install zed --how');
      expect(result.success).toBe(true);
      expect(result.stdout).toContain('Installation Instructions for Zed');
      expect(result.stdout).toContain('Binary:');
      expect(result.stdout).toContain('zed');
      expect(result.stdout).toMatch(/Binary:\s+\w+/);
    });

    it.concurrent('should print installation instructions for antigravity', async () => {
      const result = await runCliAsync('install antigravity --how');
      expect(result.success).toBe(true);
      expect(result.stdout).toContain('Installation Instructions for Google Antigravity');
      expect(result.stdout).toContain('Binary:');
      expect(result.stdout).toContain('antigravity (linux)');
      expect(result.stdout).toContain('agy (darwin)');
    });

    it.concurrent('should print installation instructions for cursor-cli with curl', async () => {
      const result = await runCliAsync('install cursor-cli --how');
      expect(result.success).toBe(true);
      expect(result.stdout).toContain('Installation Instructions for Cursor CLI');
      expect(result.stdout).toContain('Binary:');
      expect(result.stdout).toContain('cursor');
      expect(result.stdout).toContain('curl');
      expect(result.stdout).toContain('bash');
      expect(result.stdout).toContain('Package Manager');
      expect(result.stdout).toContain('--version');
    });

    it.concurrent('should print installation instructions for claude-code with curl', async () => {
      const result = await runCliAsync('install claude-code --how');
      expect(result.success).toBe(true);
      expect(result.stdout).toContain('Installation Instructions for Claude Code');
      expect(result.stdout).toContain('Binary:');
      expect(result.stdout).toContain('claude');
      expect(result.stdout).toContain('curl');
      expect(result.stdout).toContain('Package Manager');
    });
  });

  it('should show tool listing when no argument given', () => {
    const result = runCli('install');
    expect(result.success).toBe(true);
    expect(result.stdout).toContain('shep install <tool>');
    expect(result.stdout).toContain('vscode');
    expect(result.stdout).toContain('claude-code');
  });

  describe('error handling', () => {
    it('should fail for unknown tool with friendly message and suggestions', () => {
      const result = runCli('install nonexistent-tool');
      expect(result.success).toBe(false);
      expect(result.exitCode).not.toBe(0);
      expect(result.stdout).toContain("don't recognize");
      expect(result.stdout).toContain('nonexistent-tool');
      expect(result.stdout).toContain('vscode');
      expect(result.stdout).toContain('cursor');
      expect(result.stdout).toContain('claude-code');
    });

    it('should handle tool with special characters gracefully', () => {
      const result = runCli('install "invalid-tool!"');
      expect(result.success).toBe(false);
      expect(result.stdout).toContain("don't recognize");
    });

    it('should provide helpful output for empty string tool name', () => {
      const result = runCli('install ""');
      expect(result.stdout).toContain('shep install <tool>');
    });
  });
});
