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
  describe('shep install --help', () => {
    it('should display help text', () => {
      const result = runCli('install --help');
      expect(result.success).toBe(true);
      expect(result.stdout).toContain('Install a development tool');
      expect(result.stdout).toContain('[tool]');
      expect(result.stdout).toContain('--how');
    });
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
      expect(result.stdout).toContain('Verify Installation');
    });

    it.concurrent('should print installation instructions for cursor', async () => {
      const result = await runCliAsync('install cursor --how');
      expect(result.success).toBe(true);
      expect(result.stdout).toContain('Installation Instructions for Cursor');
      expect(result.stdout).toContain('Binary:');
      expect(result.stdout).toContain('cursor');
    });

    it.concurrent('should print installation instructions for windsurf', async () => {
      const result = await runCliAsync('install windsurf --how');
      expect(result.success).toBe(true);
      expect(result.stdout).toContain('Installation Instructions for Windsurf');
      expect(result.stdout).toContain('Binary:');
      expect(result.stdout).toContain('windsurf');
    });

    it.concurrent('should print installation instructions for zed', async () => {
      const result = await runCliAsync('install zed --how');
      expect(result.success).toBe(true);
      expect(result.stdout).toContain('Installation Instructions for Zed');
      expect(result.stdout).toContain('Binary:');
      expect(result.stdout).toContain('zed');
    });

    it.concurrent('should print installation instructions for antigravity', async () => {
      const result = await runCliAsync('install antigravity --how');
      expect(result.success).toBe(true);
      expect(result.stdout).toContain('Installation Instructions for Google Antigravity');
      expect(result.stdout).toContain('Binary:');
      expect(result.stdout).toContain('antigravity (linux)');
      expect(result.stdout).toContain('agy (darwin)');
    });

    it.concurrent('should print installation instructions for cursor-cli', async () => {
      const result = await runCliAsync('install cursor-cli --how');
      expect(result.success).toBe(true);
      expect(result.stdout).toContain('Installation Instructions for Cursor CLI');
      expect(result.stdout).toContain('Binary:');
      expect(result.stdout).toContain('cursor');
      expect(result.stdout).toContain('curl');
    });

    it.concurrent('should print installation instructions for claude-code', async () => {
      const result = await runCliAsync('install claude-code --how');
      expect(result.success).toBe(true);
      expect(result.stdout).toContain('Installation Instructions for Claude Code');
      expect(result.stdout).toContain('Binary:');
      expect(result.stdout).toContain('claude');
      expect(result.stdout).toContain('curl');
    });

    it('should include documentation URL for each tool', () => {
      const result = runCli('install vscode --how');
      expect(result.success).toBe(true);
      expect(result.stdout).toContain('https://');
    });

    it('should include verify command for each tool', () => {
      const result = runCli('install vscode --how');
      expect(result.success).toBe(true);
      expect(result.stdout).toContain('--version');
    });
  });

  describe('shep install <invalid-tool>', () => {
    it('should fail for unknown tool with friendly message', () => {
      const result = runCli('install nonexistent-tool');
      expect(result.success).toBe(false);
      expect(result.exitCode).not.toBe(0);
      expect(result.stdout).toContain("don't recognize");
      expect(result.stdout).toContain('nonexistent-tool');
    });

    it('should suggest available tools for unknown tool', () => {
      const result = runCli('install invalid');
      expect(result.success).toBe(false);
      expect(result.stdout).toContain('vscode');
      expect(result.stdout).toContain('cursor');
      expect(result.stdout).toContain('claude-code');
    });
  });

  describe('shep install (without arguments)', () => {
    it('should show tool listing when no argument given', () => {
      const result = runCli('install');
      expect(result.success).toBe(true);
      expect(result.stdout).toContain('shep install <tool>');
      expect(result.stdout).toContain('vscode');
      expect(result.stdout).toContain('claude-code');
    });
  });

  describe('output structure validation', () => {
    it('should include all required sections in --how output', () => {
      const result = runCli('install vscode --how');
      const output = result.stdout;

      const sections = [
        'Installation Instructions for Visual Studio Code',
        'Binary:',
        'Installation Commands',
        'Documentation',
        'Verify Installation',
      ];

      for (const section of sections) {
        expect(output).toContain(section);
      }
    });

    it.concurrent('should format Binary: label consistently across tools', async () => {
      const results = await Promise.all(
        ['vscode', 'cursor', 'windsurf', 'zed'].map((tool) => runCliAsync(`install ${tool} --how`))
      );
      for (const result of results) {
        expect(result.stdout).toMatch(/Binary:\s+\w+/);
      }
    });

    it('should include platform-specific installation commands', () => {
      const result = runCli('install vscode --how');
      expect(result.stdout).toMatch(/\[(linux|darwin)\]/);
    });

    it('should provide verification command', () => {
      const result = runCli('install cursor-cli --how');
      expect(result.stdout).toContain('--version');
    });

    it('should include name and summary in output', () => {
      const result = runCli('install vscode --how');
      expect(result.stdout).toContain('Visual Studio Code');
      expect(result.stdout).toContain('Lightweight but powerful source code editor');
    });
  });

  describe('curl-based tools', () => {
    it('should show curl as package manager for cursor-cli', () => {
      const result = runCli('install cursor-cli --how');
      expect(result.success).toBe(true);
      expect(result.stdout).toContain('curl');
      expect(result.stdout).toContain('Package Manager');
    });

    it('should show curl as package manager for claude-code', () => {
      const result = runCli('install claude-code --how');
      expect(result.success).toBe(true);
      expect(result.stdout).toContain('curl');
      expect(result.stdout).toContain('Package Manager');
    });

    it('should include curl install commands for curl tools', () => {
      const result = runCli('install cursor-cli --how');
      expect(result.stdout).toContain('curl');
      expect(result.stdout).toContain('bash');
    });
  });

  describe('error handling edge cases', () => {
    it('should handle tool with special characters gracefully', () => {
      const result = runCli('install "invalid-tool!"');
      expect(result.success).toBe(false);
      expect(result.stdout).toContain("don't recognize");
    });

    it('should provide helpful error for empty string tool name', () => {
      const result = runCli('install ""');
      expect(result.stdout).toContain('shep install <tool>');
    });

    it('should suggest all available tools for unknown tool', () => {
      const result = runCli('install nonexistent');
      const output = result.stdout;
      expect(output).toMatch(/vscode.*cursor|cursor.*vscode/s);
    });
  });
});
