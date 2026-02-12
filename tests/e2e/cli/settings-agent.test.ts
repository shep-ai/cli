/**
 * Settings Agent Command E2E Tests
 *
 * Tests for the `shep settings agent` command using non-interactive flags.
 * Interactive wizard mode cannot be tested in E2E (requires stdin).
 *
 * Note: Configuration tests require the `claude` binary to be installed,
 * as the use case validates agent availability before persisting config.
 * These tests are skipped in CI where claude is not available.
 */

import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { runCli } from '../../helpers/cli/index.js';

/**
 * Check if claude binary is available on the system.
 * ConfigureAgentUseCase validates agent availability, so tests
 * that configure require the binary to be present.
 */
function isClaudeAvailable(): boolean {
  try {
    execFileSync('claude', ['--version'], { stdio: 'pipe', timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}

const claudeAvailable = isClaudeAvailable();

describe('CLI: settings agent', () => {
  describe('shep settings agent --help', () => {
    it('should display help for agent command', () => {
      const result = runCli('settings agent --help');

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('agent');
      expect(result.stdout).toContain('--agent');
      expect(result.stdout).toContain('--auth');
      expect(result.stdout).toContain('--token');
    });
  });

  describe.skipIf(!claudeAvailable)(
    'shep settings agent --agent claude-code --auth session',
    () => {
      it('should configure agent non-interactively', () => {
        const result = runCli('settings agent --agent claude-code --auth session');

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('Agent configured');
        expect(result.stdout).toContain('claude-code');
        expect(result.stdout).toContain('session');
      });

      it('should persist agent config to settings', () => {
        // Configure agent
        const configResult = runCli('settings agent --agent claude-code --auth session');
        expect(configResult.exitCode).toBe(0);

        // Verify in settings show
        const showResult = runCli('settings show --output json');
        expect(showResult.exitCode).toBe(0);

        const settings = JSON.parse(showResult.stdout);
        expect(settings.agent).toBeDefined();
        expect(settings.agent.type).toBe('claude-code');
        expect(settings.agent.authMethod).toBe('session');
      }, 30_000);
    }
  );

  describe.skipIf(!claudeAvailable)(
    'shep settings agent --agent claude-code --auth token --token sk-test',
    () => {
      it('should configure token-based auth', () => {
        const result = runCli(
          'settings agent --agent claude-code --auth token --token sk-test-key'
        );

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('Agent configured');
      });

      it('should persist token to settings', () => {
        runCli('settings agent --agent claude-code --auth token --token sk-persisted');

        const showResult = runCli('settings show --output json');
        const settings = JSON.parse(showResult.stdout);
        expect(settings.agent.authMethod).toBe('token');
        expect(settings.agent.token).toBe('sk-persisted');
      }, 30_000);
    }
  );

  describe('error handling', () => {
    it('should fail when --agent provided without --auth', () => {
      const result = runCli('settings agent --agent claude-code');

      expect(result.success).toBe(false);
      expect(result.stdout + result.stderr).toContain('--auth');
    });

    it('should fail for unsupported agent type', () => {
      const result = runCli('settings agent --agent invalid-agent --auth session');

      expect(result.success).toBe(false);
    });
  });
});
