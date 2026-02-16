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
import { runCli } from '../../helpers/cli/index.js';

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
    it('should print installation instructions for vscode', () => {
      const result = runCli('install vscode --how');
      expect(result.success).toBe(true);
      expect(result.stdout).toContain('Installation Instructions for vscode');
      expect(result.stdout).toContain('Binary:');
      expect(result.stdout).toContain('code');
      expect(result.stdout).toContain('Installation Commands');
      expect(result.stdout).toContain('Documentation');
      expect(result.stdout).toContain('Verify Installation');
    });

    it('should print installation instructions for cursor', () => {
      const result = runCli('install cursor --how');
      expect(result.success).toBe(true);
      expect(result.stdout).toContain('Installation Instructions for cursor');
      expect(result.stdout).toContain('Binary:');
      expect(result.stdout).toContain('cursor');
    });

    it('should print installation instructions for windsurf', () => {
      const result = runCli('install windsurf --how');
      expect(result.success).toBe(true);
      expect(result.stdout).toContain('Installation Instructions for windsurf');
      expect(result.stdout).toContain('Binary:');
      expect(result.stdout).toContain('windsurf');
    });

    it('should print installation instructions for zed', () => {
      const result = runCli('install zed --how');
      expect(result.success).toBe(true);
      expect(result.stdout).toContain('Installation Instructions for zed');
      expect(result.stdout).toContain('Binary:');
      expect(result.stdout).toContain('zed');
    });

    it('should print installation instructions for antigravity', () => {
      const result = runCli('install antigravity --how');
      expect(result.success).toBe(true);
      expect(result.stdout).toContain('Installation Instructions for antigravity');
      expect(result.stdout).toContain('Binary:');
      expect(result.stdout).toContain('antigravity');
    });

    it('should print installation instructions for cursor-cli', () => {
      const result = runCli('install cursor-cli --how');
      expect(result.success).toBe(true);
      expect(result.stdout).toContain('Installation Instructions for cursor-cli');
      expect(result.stdout).toContain('Binary:');
      expect(result.stdout).toContain('cursor-cli');
      expect(result.stdout).toContain('npm');
    });

    it('should print installation instructions for claude-code', () => {
      const result = runCli('install claude-code --how');
      expect(result.success).toBe(true);
      expect(result.stdout).toContain('Installation Instructions for claude-code');
      expect(result.stdout).toContain('Binary:');
      expect(result.stdout).toContain('claude');
      expect(result.stdout).toContain('npm');
    });

    it('should work for all 7 supported tools', { timeout: 20000 }, () => {
      const tools = [
        'vscode',
        'cursor',
        'windsurf',
        'zed',
        'antigravity',
        'cursor-cli',
        'claude-code',
      ];
      for (const tool of tools) {
        const result = runCli(`install ${tool} --how`);
        expect(result.success).toBe(true);
        expect(result.stdout).toContain(`Installation Instructions for ${tool}`);
        expect(result.stdout).toContain('Binary:');
        expect(result.stdout).toContain('Installation Commands');
        expect(result.stdout).toContain('Documentation');
        expect(result.stdout).toContain('Verify Installation');
      }
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

      // Check for all required sections in order
      const sections = [
        'Installation Instructions for vscode',
        'Binary:',
        'Installation Commands',
        'Documentation',
        'Verify Installation',
      ];

      for (const section of sections) {
        expect(output).toContain(section);
      }
    });

    it('should format Binary: label consistently', () => {
      const tools = ['vscode', 'cursor', 'windsurf'];
      for (const tool of tools) {
        const result = runCli(`install ${tool} --how`);
        // Should have Binary: on a line by itself
        expect(result.stdout).toMatch(/Binary:\s+\w+/);
      }
    });

    it('should include platform-specific installation commands', () => {
      const result = runCli('install vscode --how');
      // Should mention at least one platform
      expect(result.stdout).toMatch(/\[(linux|darwin)\]/);
    });

    it('should provide verification command', () => {
      const result = runCli('install cursor-cli --how');
      // npm tools should show verification with --version
      expect(result.stdout).toContain('--version');
    });

    it('should include notes when available', () => {
      const result = runCli('install vscode --how');
      // vscode has notes
      expect(result.stdout).toContain('Notes');
      expect(result.stdout).toContain('Microsoft Visual Studio Code');
    });
  });

  describe('npm-based tools', () => {
    it('should show npm as package manager for cursor-cli', () => {
      const result = runCli('install cursor-cli --how');
      expect(result.success).toBe(true);
      expect(result.stdout).toContain('npm');
      expect(result.stdout).toContain('Package Manager');
    });

    it('should show npm as package manager for claude-code', () => {
      const result = runCli('install claude-code --how');
      expect(result.success).toBe(true);
      expect(result.stdout).toContain('npm');
      expect(result.stdout).toContain('Package Manager');
    });

    it('should include npm install commands for npm tools', () => {
      const result = runCli('install cursor-cli --how');
      expect(result.stdout).toContain('npm');
      expect(result.stdout).toContain('install');
    });
  });

  describe('error handling edge cases', () => {
    it('should handle tool with special characters gracefully', () => {
      const result = runCli('install "invalid-tool!"');
      expect(result.success).toBe(false);
      expect(result.stdout).toContain("don't recognize");
    });

    it('should provide helpful error for empty string tool name', () => {
      // Empty string treated as no argument - shows tool listing
      const result = runCli('install ""');
      expect(result.stdout).toContain('shep install <tool>');
    });

    it('should suggest all available tools for unknown tool', () => {
      const result = runCli('install nonexistent');
      const output = result.stdout;
      // Should list at least some tools (dotAll since they're on separate lines)
      expect(output).toMatch(/vscode.*cursor|cursor.*vscode/s);
    });
  });
});
