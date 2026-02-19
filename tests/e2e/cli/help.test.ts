/**
 * CLI Help Command E2E Tests
 *
 * Tests for the `shep --help` and `shep` (default) commands.
 * Verifies help output displays correctly.
 */

import { describe, it, expect } from 'vitest';
import { runCli } from '../../helpers/cli/index.js';

describe('CLI: help', () => {
  it('should display help with usage, commands, and options when no args given', () => {
    const result = runCli('');

    expect(result.success).toBe(true);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Usage:');
    expect(result.stdout).toContain('shep');
    expect(result.stdout).toContain('version');
    expect(result.stdout).toContain('Display version information');
    expect(result.stdout).toContain('-v, --version');
    expect(result.stdout).toContain('-h, --help');
  });

  it('should display same help output with --help flag', () => {
    const defaultResult = runCli('');
    const helpResult = runCli('--help');

    expect(helpResult.success).toBe(true);
    expect(helpResult.exitCode).toBe(0);
    expect(helpResult.stdout).toContain('Usage:');
    expect(helpResult.stdout).toBe(defaultResult.stdout);
  }, 30_000);

  it('should display help with -h short flag', () => {
    const result = runCli('-h');

    expect(result.success).toBe(true);
    expect(result.stdout).toContain('Usage:');
  });

  it('should treat help as unknown subcommand', () => {
    const result = runCli('help version');

    expect(result.success).toBe(false);
  });

  it('should display version command help with version --help', () => {
    const result = runCli('version --help');

    expect(result.success).toBe(true);
    expect(result.stdout).toContain('version');
    expect(result.stdout).toContain('Display version information');
  });
});
