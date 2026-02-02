/**
 * CLI Test Runner
 *
 * Utility for executing CLI commands in E2E tests.
 * Provides consistent interface for running commands and capturing output.
 *
 * NOTE: Uses execSync intentionally for test simplicity. All inputs are
 * controlled by test code, not user input, so command injection is not a risk.
 *
 * @example
 * import { runCli, createCliRunner } from '@tests/helpers/cli/runner';
 *
 * // Simple usage
 * const result = runCli('version');
 *
 * // With custom options
 * const runner = createCliRunner({ cwd: '/custom/path' });
 * const result = runner.run('version');
 */

import { execSync, type ExecSyncOptionsWithStringEncoding } from 'node:child_process';
import { resolve } from 'node:path';

/**
 * Result of a CLI command execution
 */
export interface CliResult {
  /** Standard output */
  stdout: string;
  /** Standard error (empty for successful commands) */
  stderr: string;
  /** Exit code (0 = success) */
  exitCode: number;
  /** Whether the command succeeded */
  success: boolean;
}

/**
 * Options for CLI runner
 */
export interface CliRunnerOptions {
  /** Working directory for command execution */
  cwd?: string;
  /** Environment variables to set */
  env?: Record<string, string>;
  /** Timeout in milliseconds */
  timeout?: number;
}

/**
 * CLI Runner instance
 */
export interface CliRunner {
  /**
   * Run a CLI command
   * @param args - Command arguments (e.g., 'version', '--help')
   * @returns Command result with stdout, stderr, exitCode
   */
  run: (args: string) => CliResult;

  /**
   * Run a CLI command and expect it to succeed
   * @param args - Command arguments
   * @throws Error if command fails
   */
  runOrThrow: (args: string) => CliResult;
}

/** Project root directory */
const PROJECT_ROOT = resolve(__dirname, '../../..');

/** Path to CLI entry point (TypeScript via tsx) */
const CLI_PATH_DEV = resolve(PROJECT_ROOT, 'src/presentation/cli/index.ts');

/** Path to CLI entry point (compiled JS) */
const CLI_PATH_DIST = resolve(PROJECT_ROOT, 'dist/presentation/cli/index.js');

/**
 * Default runner options
 */
const DEFAULT_OPTIONS: Required<CliRunnerOptions> = {
  cwd: PROJECT_ROOT,
  env: {},
  timeout: 10000,
};

/**
 * Execute CLI command and capture result
 *
 * Security: All command arguments come from test code, not user input.
 * execSync is used intentionally for test simplicity.
 */
function executeCommand(
  args: string,
  options: Required<CliRunnerOptions>,
  useDist = false
): CliResult {
  const cliPath = useDist ? CLI_PATH_DIST : CLI_PATH_DEV;
  const runner = useDist ? 'node' : 'npx tsx';
  const command = `${runner} ${cliPath} ${args}`;

  const execOptions: ExecSyncOptionsWithStringEncoding = {
    cwd: options.cwd,
    encoding: 'utf-8',
    timeout: options.timeout,
    env: {
      ...process.env,
      ...options.env,
      // Force no color for consistent test output
      NO_COLOR: '1',
      FORCE_COLOR: '0',
    },
    stdio: ['pipe', 'pipe', 'pipe'],
  };

  try {
    const stdout = execSync(command, execOptions);
    return {
      stdout: stdout.trim(),
      stderr: '',
      exitCode: 0,
      success: true,
    };
  } catch (error) {
    const execError = error as {
      stdout?: Buffer | string;
      stderr?: Buffer | string;
      status?: number;
    };

    return {
      stdout: String(execError.stdout ?? '').trim(),
      stderr: String(execError.stderr ?? '').trim(),
      exitCode: execError.status ?? 1,
      success: false,
    };
  }
}

/**
 * Create a CLI runner with custom options
 *
 * @param options - Runner configuration
 * @param useDist - Use compiled dist instead of tsx (for production testing)
 * @returns CLI runner instance
 *
 * @example
 * const runner = createCliRunner({ timeout: 5000 });
 * const result = runner.run('version');
 */
export function createCliRunner(options: CliRunnerOptions = {}, useDist = false): CliRunner {
  const mergedOptions: Required<CliRunnerOptions> = {
    ...DEFAULT_OPTIONS,
    ...options,
    env: { ...DEFAULT_OPTIONS.env, ...options.env },
  };

  return {
    run: (args: string) => executeCommand(args, mergedOptions, useDist),

    runOrThrow: (args: string) => {
      const result = executeCommand(args, mergedOptions, useDist);
      if (!result.success) {
        throw new Error(
          `CLI command failed with exit code ${result.exitCode}:\n` +
            `Command: shep ${args}\n` +
            `Stdout: ${result.stdout}\n` +
            `Stderr: ${result.stderr}`
        );
      }
      return result;
    },
  };
}

/**
 * Run a CLI command with default options
 *
 * @param args - Command arguments
 * @returns Command result
 *
 * @example
 * const result = runCli('version');
 * expect(result.stdout).toContain('@shepai/cli');
 */
export function runCli(args: string): CliResult {
  const runner = createCliRunner();
  return runner.run(args);
}

/**
 * Run a CLI command and throw if it fails
 *
 * @param args - Command arguments
 * @returns Command result
 * @throws Error if command fails
 *
 * @example
 * const result = runCliOrThrow('version');
 * // Throws if command fails
 */
export function runCliOrThrow(args: string): CliResult {
  const runner = createCliRunner();
  return runner.runOrThrow(args);
}
