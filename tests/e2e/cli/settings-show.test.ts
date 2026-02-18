/**
 * Settings Show Command E2E Tests
 *
 * Tests for the `shep settings show` command with different output formats.
 *
 * TDD Phase: RED
 * - These tests are written BEFORE implementation
 * - All tests should FAIL initially (command doesn't exist yet)
 */

import { describe, it, expect } from 'vitest';
import { runCli } from '../../helpers/cli/index.js';

describe('CLI: settings show', () => {
  describe('shep settings show (table format - default)', () => {
    it('should display settings as a formatted table', () => {
      // This test will FAIL because the command doesn't exist yet (RED phase)
      const result = runCli('settings show');

      // These assertions will fail initially
      expect(result.exitCode).toBe(0);
      expect(result.success).toBe(true);
      expect(result.stdout).toContain('Models'); // Table headers
      expect(result.stdout).toContain('Environment');
      expect(result.stdout).toContain('System');
    });

    it('should display database metadata', () => {
      const result = runCli('settings show');

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Database');
      expect(result.stdout).toContain('/data');
    });
  });

  describe('shep settings show --output json', () => {
    it('should output valid JSON', () => {
      const result = runCli('settings show --output json');

      expect(result.exitCode).toBe(0);
      expect(result.success).toBe(true);

      // Should be valid JSON
      expect(() => JSON.parse(result.stdout)).not.toThrow();

      const parsed = JSON.parse(result.stdout);
      expect(parsed).toHaveProperty('id');
      expect(parsed).toHaveProperty('models');
      expect(parsed).toHaveProperty('user');
      expect(parsed).toHaveProperty('environment');
      expect(parsed).toHaveProperty('system');
    });

    it('should include all settings sections in JSON', () => {
      const result = runCli('settings show --output json');

      const parsed = JSON.parse(result.stdout);
      expect(parsed.models).toBeDefined();
      expect(parsed.user).toBeDefined();
      expect(parsed.environment).toBeDefined();
      expect(parsed.system).toBeDefined();
    });
  });

  describe('shep settings show --output yaml', () => {
    it('should output valid YAML', () => {
      const result = runCli('settings show --output yaml');

      expect(result.exitCode).toBe(0);
      expect(result.success).toBe(true);

      // Should contain YAML syntax
      expect(result.stdout).toContain('models:');
      expect(result.stdout).toContain('environment:');
      expect(result.stdout).toContain('system:');
    });

    it('should be properly indented YAML', () => {
      const result = runCli('settings show --output yaml');

      // Check for indented keys (2-space indent)
      expect(result.stdout).toMatch(/^ {2}\w+:/m);
    });
  });

  describe('shep settings show -o <format> (short flag)', () => {
    it('should work with -o json', () => {
      const result = runCli('settings show -o json');

      expect(result.exitCode).toBe(0);
      expect(() => JSON.parse(result.stdout)).not.toThrow();
    });

    it('should work with -o yaml', () => {
      const result = runCli('settings show -o yaml');

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('models:');
    });

    it('should work with -o table', () => {
      const result = runCli('settings show -o table');

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Models');
    });
  });

  describe('error handling', () => {
    it('should handle invalid output format', () => {
      const result = runCli('settings show --output invalid');

      expect(result.success).toBe(false);
      expect(result.stderr).toContain('invalid');
    });
  });
});
