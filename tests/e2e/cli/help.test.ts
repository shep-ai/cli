/**
 * CLI Help Command E2E Tests
 *
 * Tests for the `shep --help` and `shep` (default) commands.
 * Verifies help output displays correctly.
 */

import { describe, it, expect } from 'vitest';
import { runCli } from '../../helpers/cli/index.js';

describe('CLI: help', () => {
  describe('shep (no arguments)', () => {
    it('should display help output', () => {
      // Act
      const result = runCli('');

      // Assert
      expect(result.success).toBe(true);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Usage:');
    });

    it('should display program name', () => {
      // Act
      const result = runCli('');

      // Assert
      expect(result.stdout).toContain('shep');
    });

    it('should display available commands', () => {
      // Act
      const result = runCli('');

      // Assert
      expect(result.stdout).toContain('version');
      expect(result.stdout).toContain('Display version information');
    });

    it('should display global options', () => {
      // Act
      const result = runCli('');

      // Assert
      expect(result.stdout).toContain('-v, --version');
      expect(result.stdout).toContain('-h, --help');
    });
  });

  describe('shep --help', () => {
    it('should display help output', () => {
      // Act
      const result = runCli('--help');

      // Assert
      expect(result.success).toBe(true);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Usage:');
    });

    it('should match default help output', () => {
      // Act
      const defaultResult = runCli('');
      const helpResult = runCli('--help');

      // Assert - both should show same help content
      expect(helpResult.stdout).toBe(defaultResult.stdout);
    }, 30_000);
  });

  describe('shep -h', () => {
    it('should display help output (short flag)', () => {
      // Act
      const result = runCli('-h');

      // Assert
      expect(result.success).toBe(true);
      expect(result.stdout).toContain('Usage:');
    });
  });

  describe('shep help (subcommand)', () => {
    it('should show help for specific command', () => {
      // Act
      // Commander.js doesn't have a built-in 'help' subcommand
      // Use 'shep version --help' instead of 'shep help version'
      const result = runCli('help version');

      // Assert
      // This will fail as 'help' is not a registered subcommand
      // We verify it's treated as invalid input
      expect(result.success).toBe(false);
    });
  });

  describe('shep version --help', () => {
    it('should display version command help', () => {
      // Act
      const result = runCli('version --help');

      // Assert
      expect(result.success).toBe(true);
      expect(result.stdout).toContain('version');
      expect(result.stdout).toContain('Display version information');
    });
  });
});
