/**
 * CLI Version Command E2E Tests
 *
 * Tests for the `shep version` command and `shep --version` flag.
 * Verifies correct output format and content.
 */

import { describe, it, expect } from 'vitest';
import { runCli } from '../../helpers/cli/index.js';

describe('CLI: version', () => {
  describe('shep version', () => {
    it('should display package name and version', () => {
      // Act
      const result = runCli('version');

      // Assert
      expect(result.success).toBe(true);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('@shepai/cli');
      expect(result.stdout).toMatch(/v\d+\.\d+\.\d+/); // vX.X.X format
    });

    it('should display package description', () => {
      // Act
      const result = runCli('version');

      // Assert
      expect(result.stdout).toContain('Autonomous AI Native SDLC Platform');
    });

    it('should display Node.js version', () => {
      // Act
      const result = runCli('version');

      // Assert
      expect(result.stdout).toContain('Node:');
      expect(result.stdout).toMatch(/Node:.*v\d+\.\d+\.\d+/);
    });

    it('should display platform information', () => {
      // Act
      const result = runCli('version');

      // Assert
      expect(result.stdout).toContain('Platform:');
      // Should contain platform and architecture
      expect(result.stdout).toMatch(/Platform:.*\w+\s+\w+/);
    });
  });

  describe('shep --version', () => {
    it('should display only version number', () => {
      // Act
      const result = runCli('--version');

      // Assert
      expect(result.success).toBe(true);
      expect(result.exitCode).toBe(0);
      // Should be just the version number (e.g., "0.1.0")
      expect(result.stdout).toMatch(/^\d+\.\d+\.\d+$/);
    });

    it('should display same version as package.json', () => {
      // Act
      const result = runCli('--version');

      // Assert - version should match package.json (currently 0.1.0)
      expect(result.stdout).toBe('0.1.0');
    });
  });

  describe('shep -v', () => {
    it('should display version number (short flag)', () => {
      // Act
      const result = runCli('-v');

      // Assert
      expect(result.success).toBe(true);
      expect(result.stdout).toMatch(/^\d+\.\d+\.\d+$/);
    });
  });
});
