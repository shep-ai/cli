/**
 * Shell Script E2E Test Runner
 *
 * Auto-discovers and runs tests/scripts/cli/test-*.sh as vitest test cases.
 *
 * Script conventions:
 *   - Header comment `# Requirements: Docker` marks Docker-dependent tests
 *   - Header comment `# Timeout: 300` sets timeout in seconds
 *   - Exit 0 = pass, 1 = fail, 2 = skip
 *
 * Run all: pnpm test:e2e:cli
 * Run single script manually: bash tests/scripts/cli/test-shep-ui.sh
 */

import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { resolve, basename, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, '../../..');
const SCRIPTS_DIR = resolve(PROJECT_ROOT, 'tests/scripts/cli');

const DEFAULT_TIMEOUT = 30_000;
const SKIP_EXIT_CODE = 2;

interface ScriptMeta {
  requiresDocker: boolean;
  timeout: number;
  description: string;
}

function parseScriptMeta(scriptPath: string): ScriptMeta {
  const content = readFileSync(scriptPath, 'utf-8');
  const lines = content.split('\n').slice(0, 15);

  let requiresDocker = false;
  let timeout = DEFAULT_TIMEOUT;
  let description = '';

  for (const line of lines) {
    const reqMatch = line.match(/^#\s*Requirements:\s*(.+)/i);
    if (reqMatch) requiresDocker = reqMatch[1].toLowerCase().includes('docker');

    const timeoutMatch = line.match(/^#\s*Timeout:\s*(\d+)/i);
    if (timeoutMatch) timeout = parseInt(timeoutMatch[1], 10) * 1000;

    if (
      !description &&
      line.startsWith('# ') &&
      !line.startsWith('#!') &&
      !line.match(/^#\s*(Requirements|Timeout|tests\/)/i)
    ) {
      description = line.replace(/^#\s*/, '');
    }
  }

  return { requiresDocker, timeout, description };
}

function discoverScripts(): string[] {
  try {
    return readdirSync(SCRIPTS_DIR)
      .filter((f) => f.startsWith('test-') && f.endsWith('.sh'))
      .sort()
      .map((f) => resolve(SCRIPTS_DIR, f));
  } catch {
    return [];
  }
}

function isDockerAvailable(): boolean {
  try {
    execFileSync('docker', ['info'], { stdio: 'pipe', timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}

/**
 * Run a shell script and capture output.
 * Uses execFileSync with 'bash' as the executable to avoid shell injection.
 * Script paths are controlled by test code (auto-discovered from known directory).
 */
function runScript(scriptPath: string, timeout: number) {
  try {
    const stdout = execFileSync('bash', [scriptPath], {
      cwd: PROJECT_ROOT,
      encoding: 'utf-8',
      timeout,
      env: {
        ...process.env,
        TEST_ARTIFACTS_DIR: resolve(PROJECT_ROOT, '.test-artifacts'),
      },
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return { stdout: stdout.trim(), stderr: '', exitCode: 0 };
  } catch (error) {
    const e = error as { stdout?: string | Buffer; stderr?: string | Buffer; status?: number };
    return {
      stdout: String(e.stdout ?? '').trim(),
      stderr: String(e.stderr ?? '').trim(),
      exitCode: e.status ?? 1,
    };
  }
}

// --- Discovery ---
const scripts = discoverScripts();
const dockerAvailable = scripts.some((s) => parseScriptMeta(s).requiresDocker)
  ? isDockerAvailable()
  : true; // Only check Docker if any script needs it

describe('CLI: shell script e2e tests', () => {
  if (scripts.length === 0) {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    it.skip('no test scripts found in tests/scripts/cli/', () => {});
    return;
  }

  for (const scriptPath of scripts) {
    const name = basename(scriptPath, '.sh').replace(/^test-/, '');
    const meta = parseScriptMeta(scriptPath);

    const shouldSkip = meta.requiresDocker && !dockerAvailable;
    const testFn = shouldSkip ? it.skip : it;

    testFn(
      `${name}: ${meta.description}`,
      () => {
        const result = runScript(scriptPath, meta.timeout);

        if (result.exitCode === SKIP_EXIT_CODE) {
          console.log(`[SKIP] ${name}: ${result.stdout.split('\n').pop()}`);
          return;
        }

        if (result.stdout) console.log(result.stdout);
        if (result.stderr) console.error(result.stderr);

        expect(
          result.exitCode,
          `Script ${name} failed (exit ${result.exitCode})\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`
        ).toBe(0);
      },
      meta.timeout
    );
  }
});
