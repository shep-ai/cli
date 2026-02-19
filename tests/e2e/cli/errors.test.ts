/**
 * CLI Error Handling E2E Tests
 *
 * Tests for CLI error handling and unknown commands.
 */

import { describe, it, expect } from 'vitest';
import { runCli } from '../../helpers/cli/index.js';

describe('CLI: error handling', () => {
  it('should show error and exit non-zero for unknown command', () => {
    const result = runCli('nonexistent-command');

    expect(result.success).toBe(false);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('error');
  });

  it('should show error for unknown option', () => {
    const result = runCli('--unknown-option');

    expect(result.success).toBe(false);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('unknown option');
  });
});
