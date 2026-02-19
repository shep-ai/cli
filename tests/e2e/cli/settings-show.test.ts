/**
 * Settings Show Command E2E Tests
 *
 * Tests for the `shep settings show` command with different output formats.
 */

import { describe, it, expect } from 'vitest';
import { runCli } from '../../helpers/cli/index.js';

describe('CLI: settings show', () => {
  it('should display settings as a formatted table with all sections and database metadata', () => {
    const result = runCli('settings show');

    expect(result.exitCode).toBe(0);
    expect(result.success).toBe(true);
    expect(result.stdout).toContain('Models');
    expect(result.stdout).toContain('Environment');
    expect(result.stdout).toContain('System');
    expect(result.stdout).toContain('Database');
    expect(result.stdout).toContain('/data');
  });

  it('should output valid JSON with all settings sections', () => {
    const result = runCli('settings show --output json');

    expect(result.exitCode).toBe(0);
    expect(result.success).toBe(true);
    expect(() => JSON.parse(result.stdout)).not.toThrow();

    const parsed = JSON.parse(result.stdout);
    expect(parsed).toHaveProperty('id');
    expect(parsed).toHaveProperty('models');
    expect(parsed).toHaveProperty('user');
    expect(parsed).toHaveProperty('environment');
    expect(parsed).toHaveProperty('system');
    expect(parsed.models).toBeDefined();
    expect(parsed.user).toBeDefined();
    expect(parsed.environment).toBeDefined();
    expect(parsed.system).toBeDefined();
  });

  it('should output valid YAML with proper indentation', () => {
    const result = runCli('settings show --output yaml');

    expect(result.exitCode).toBe(0);
    expect(result.success).toBe(true);
    expect(result.stdout).toContain('models:');
    expect(result.stdout).toContain('environment:');
    expect(result.stdout).toContain('system:');
    expect(result.stdout).toMatch(/^ {2}\w+:/m);
  });

  describe('short flag -o', () => {
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

  it('should handle invalid output format', () => {
    const result = runCli('settings show --output invalid');

    expect(result.success).toBe(false);
    expect(result.stderr).toContain('invalid');
  });
});
