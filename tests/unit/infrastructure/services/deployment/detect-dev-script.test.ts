// @vitest-environment node

/**
 * detectDevScript Unit Tests
 *
 * Tests for the utility that reads package.json from a directory, detects
 * the best dev script, and identifies the package manager from lockfiles.
 *
 * TDD Phase: RED → GREEN
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('node:fs', () => ({
  readFileSync: vi.fn(),
  existsSync: vi.fn(),
}));

import { readFileSync, existsSync } from 'node:fs';
import { detectDevScript } from '@/infrastructure/services/deployment/detect-dev-script.js';

const mockReadFileSync = vi.mocked(readFileSync);
const mockExistsSync = vi.mocked(existsSync);

describe('detectDevScript', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return correct result for directory with package.json containing dev script', () => {
    mockReadFileSync.mockReturnValue(
      JSON.stringify({
        scripts: { dev: 'next dev', build: 'next build' },
      })
    );
    mockExistsSync.mockReturnValue(false);

    const result = detectDevScript('/project');

    expect(result).toEqual({
      success: true,
      packageManager: 'npm',
      scriptName: 'dev',
      command: 'npm run dev',
    });
  });

  it('should detect pnpm from pnpm-lock.yaml presence', () => {
    mockReadFileSync.mockReturnValue(
      JSON.stringify({
        scripts: { dev: 'vite' },
      })
    );
    mockExistsSync.mockImplementation((path) => {
      return String(path).endsWith('pnpm-lock.yaml');
    });

    const result = detectDevScript('/project');

    expect(result).toEqual({
      success: true,
      packageManager: 'pnpm',
      scriptName: 'dev',
      command: 'pnpm dev',
    });
  });

  it('should detect yarn from yarn.lock presence', () => {
    mockReadFileSync.mockReturnValue(
      JSON.stringify({
        scripts: { dev: 'vite' },
      })
    );
    mockExistsSync.mockImplementation((path) => {
      if (String(path).endsWith('yarn.lock')) return true;
      return false;
    });

    const result = detectDevScript('/project');

    expect(result).toEqual({
      success: true,
      packageManager: 'yarn',
      scriptName: 'dev',
      command: 'yarn dev',
    });
  });

  it('should fall back to start when dev is absent', () => {
    mockReadFileSync.mockReturnValue(
      JSON.stringify({
        scripts: { start: 'node server.js', build: 'tsc' },
      })
    );
    mockExistsSync.mockReturnValue(false);

    const result = detectDevScript('/project');

    expect(result).toEqual({
      success: true,
      packageManager: 'npm',
      scriptName: 'start',
      command: 'npm run start',
    });
  });

  it('should fall back to serve when dev and start are absent', () => {
    mockReadFileSync.mockReturnValue(
      JSON.stringify({
        scripts: { serve: 'serve -s build', build: 'tsc' },
      })
    );
    mockExistsSync.mockReturnValue(false);

    const result = detectDevScript('/project');

    expect(result).toEqual({
      success: true,
      packageManager: 'npm',
      scriptName: 'serve',
      command: 'npm run serve',
    });
  });

  it('should return error when no matching scripts exist', () => {
    mockReadFileSync.mockReturnValue(
      JSON.stringify({
        scripts: { build: 'tsc', test: 'vitest' },
      })
    );
    mockExistsSync.mockReturnValue(false);

    const result = detectDevScript('/project');

    expect(result).toEqual({
      success: false,
      error: 'No dev script found in package.json. Expected one of: dev, start, serve',
    });
  });

  it('should return error when package.json has no scripts field', () => {
    mockReadFileSync.mockReturnValue(
      JSON.stringify({
        name: 'my-project',
      })
    );
    mockExistsSync.mockReturnValue(false);

    const result = detectDevScript('/project');

    expect(result).toEqual({
      success: false,
      error: 'No dev script found in package.json. Expected one of: dev, start, serve',
    });
  });

  it('should return error when package.json is missing', () => {
    mockReadFileSync.mockImplementation(() => {
      throw new Error('ENOENT: no such file or directory');
    });
    mockExistsSync.mockReturnValue(false);

    const result = detectDevScript('/project');

    expect(result).toEqual({
      success: false,
      error: 'No package.json found in /project',
    });
  });

  it('should enforce script priority order: dev > start > serve', () => {
    mockReadFileSync.mockReturnValue(
      JSON.stringify({
        scripts: { serve: 'serve', start: 'node index.js', dev: 'vite' },
      })
    );
    mockExistsSync.mockReturnValue(false);

    const result = detectDevScript('/project');

    expect(result).toEqual({
      success: true,
      packageManager: 'npm',
      scriptName: 'dev',
      command: 'npm run dev',
    });
  });

  it('should use pnpm scriptName directly (not pnpm run scriptName) for dev', () => {
    mockReadFileSync.mockReturnValue(
      JSON.stringify({
        scripts: { dev: 'vite' },
      })
    );
    mockExistsSync.mockImplementation((path) => {
      return String(path).endsWith('pnpm-lock.yaml');
    });

    const result = detectDevScript('/project');

    expect(result.success && result.command).toBe('pnpm dev');
  });

  it('should use yarn scriptName directly (not yarn run scriptName) for dev', () => {
    mockReadFileSync.mockReturnValue(
      JSON.stringify({
        scripts: { dev: 'vite' },
      })
    );
    mockExistsSync.mockImplementation((path) => {
      return String(path).endsWith('yarn.lock');
    });

    const result = detectDevScript('/project');

    expect(result.success && result.command).toBe('yarn dev');
  });

  it('should prioritize pnpm-lock.yaml over yarn.lock when both exist', () => {
    mockReadFileSync.mockReturnValue(
      JSON.stringify({
        scripts: { dev: 'vite' },
      })
    );
    mockExistsSync.mockReturnValue(true); // all lockfiles exist

    const result = detectDevScript('/project');

    expect(result.success && result.packageManager).toBe('pnpm');
  });
});
