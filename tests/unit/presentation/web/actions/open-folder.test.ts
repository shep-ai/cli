// @vitest-environment node

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockExistsSync = vi.fn<(path: string) => boolean>();
vi.mock('node:fs', () => ({
  existsSync: (path: string) => mockExistsSync(path),
}));

const mockUnref = vi.fn();
const mockSpawn = vi.fn();
vi.mock('node:child_process', () => ({
  spawn: (...args: unknown[]) => mockSpawn(...args),
}));

const originalPlatform = process.platform;

const { openFolder } = await import(
  '../../../../../src/presentation/web/app/actions/open-folder.js'
);

describe('openFolder server action', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockExistsSync.mockReturnValue(true);
    mockSpawn.mockReturnValue({ unref: mockUnref });
    Object.defineProperty(process, 'platform', { value: originalPlatform });
  });

  it('returns error for empty repositoryPath', async () => {
    const result = await openFolder('');

    expect(result).toEqual({
      success: false,
      error: 'repositoryPath must be an absolute path',
    });
  });

  it('returns error for relative path', async () => {
    const result = await openFolder('relative/path');

    expect(result).toEqual({
      success: false,
      error: 'repositoryPath must be an absolute path',
    });
  });

  it('returns error when directory does not exist', async () => {
    Object.defineProperty(process, 'platform', { value: 'darwin' });
    mockExistsSync.mockReturnValue(false);

    const result = await openFolder('/nonexistent');

    expect(result).toEqual({ success: false, error: 'Directory not found' });
  });

  it('returns error on unsupported platform', async () => {
    Object.defineProperty(process, 'platform', { value: 'win32' });

    const result = await openFolder('/home/user/project');

    expect(result.success).toBe(false);
    expect(result.error).toContain('win32');
  });

  it('spawns correct command on darwin', async () => {
    Object.defineProperty(process, 'platform', { value: 'darwin' });

    const result = await openFolder('/home/user/project');

    expect(result.success).toBe(true);
    expect(mockSpawn).toHaveBeenCalledWith('open', ['/home/user/project'], {
      detached: true,
      stdio: 'ignore',
    });
    expect(mockUnref).toHaveBeenCalled();
  });

  it('spawns correct command on linux', async () => {
    Object.defineProperty(process, 'platform', { value: 'linux' });

    const result = await openFolder('/home/user/project');

    expect(result.success).toBe(true);
    expect(mockSpawn).toHaveBeenCalledWith('xdg-open', ['/home/user/project'], {
      detached: true,
      stdio: 'ignore',
    });
    expect(mockUnref).toHaveBeenCalled();
  });

  it('returns success with correct payload', async () => {
    Object.defineProperty(process, 'platform', { value: 'darwin' });

    const result = await openFolder('/home/user/project');

    expect(result).toEqual({ success: true, path: '/home/user/project' });
  });

  it('returns error when spawn throws', async () => {
    Object.defineProperty(process, 'platform', { value: 'darwin' });
    mockSpawn.mockImplementation(() => {
      throw new Error('spawn failed');
    });

    const result = await openFolder('/home/user/project');

    expect(result).toEqual({ success: false, error: 'spawn failed' });
  });

  it('returns generic error for non-Error throws', async () => {
    Object.defineProperty(process, 'platform', { value: 'darwin' });
    mockSpawn.mockImplementation(() => {
      throw 'unexpected';
    });

    const result = await openFolder('/home/user/project');

    expect(result).toEqual({ success: false, error: 'Failed to open folder' });
  });
});
