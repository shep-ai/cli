/**
 * CLI Error Handling E2E Tests
 *
 * Tests for CLI error handling and unknown commands.
 */

import { describe, it, expect } from 'vitest';
import { runCli } from '../../helpers/cli/index.js';

describe('CLI: error handling', () => {
  describe('unknown commands', () => {
    it('should show error for unexpected arguments', () => {
      // Act
      const result = runCli('nonexistent-command');

      // Assert
      // Commander.js treats unknown arguments as extra args, not subcommands
      expect(result.success).toBe(false);
      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('error');
    });

    it('should exit with non-zero code for invalid input', () => {
      // Act
      const result = runCli('foobar');

      // Assert
      expect(result.success).toBe(false);
      expect(result.exitCode).toBe(1);
    });
  });

  describe('unknown options', () => {
    it('should show error for unknown option', () => {
      // Act
      const result = runCli('--unknown-option');

      // Assert
      expect(result.success).toBe(false);
      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('unknown option');
    });
  });
});
