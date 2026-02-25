// @vitest-environment node

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockExistsSync = vi.fn<(path: string) => boolean>();
vi.mock('node:fs', () => ({
  existsSync: (path: string) => mockExistsSync(path),
}));

const mockUnref = vi.fn();
const mockOn = vi.fn();
const mockSpawn = vi.fn();
vi.mock('node:child_process', () => ({
  spawn: (...args: unknown[]) => mockSpawn(...args),
}));

const mockPlatform = vi.fn<() => string>();
vi.mock('node:os', () => ({
  platform: () => mockPlatform(),
}));

const { openFolder } = await import(
  '../../../../../src/presentation/web/app/actions/open-folder.js'
);

describe('openFolder server action', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockExistsSync.mockReturnValue(true);
    mockSpawn.mockReturnValue({ unref: mockUnref, on: mockOn });
    mockPlatform.mockReturnValue('darwin');
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
    mockExistsSync.mockReturnValue(false);

    const result = await openFolder('/nonexistent');

    expect(result).toEqual({ success: false, error: 'Directory not found' });
  });

  it('returns error on unsupported platform', async () => {
    mockPlatform.mockReturnValue('win32');

    const result = await openFolder('/home/user/project');

    expect(result.success).toBe(false);
    expect(result.error).toContain('win32');
  });

  it('spawns correct command on darwin', async () => {
    mockPlatform.mockReturnValue('darwin');

    const result = await openFolder('/home/user/project');

    expect(result.success).toBe(true);
    expect(mockSpawn).toHaveBeenCalledWith('open', ['/home/user/project'], {
      detached: true,
      stdio: 'ignore',
    });
    expect(mockUnref).toHaveBeenCalled();
  });

  it('spawns correct command on linux', async () => {
    mockPlatform.mockReturnValue('linux');

    const result = await openFolder('/home/user/project');

    expect(result.success).toBe(true);
    expect(mockSpawn).toHaveBeenCalledWith('xdg-open', ['/home/user/project'], {
      detached: true,
      stdio: 'ignore',
    });
    expect(mockUnref).toHaveBeenCalled();
  });

  it('returns success with correct payload', async () => {
    mockPlatform.mockReturnValue('darwin');

    const result = await openFolder('/home/user/project');

    expect(result).toEqual({ success: true, path: '/home/user/project' });
  });

  it('registers error handler on spawned child', async () => {
    mockPlatform.mockReturnValue('darwin');

    await openFolder('/home/user/project');

    expect(mockOn).toHaveBeenCalledWith('error', expect.any(Function));
  });

  it('returns error when spawn throws', async () => {
    mockPlatform.mockReturnValue('darwin');
    mockSpawn.mockImplementation(() => {
      throw new Error('spawn failed');
    });

    const result = await openFolder('/home/user/project');

    expect(result).toEqual({ success: false, error: 'spawn failed' });
  });

  it('returns generic error for non-Error throws', async () => {
    mockPlatform.mockReturnValue('darwin');
    mockSpawn.mockImplementation(() => {
      throw 'unexpected';
    });

    const result = await openFolder('/home/user/project');

    expect(result).toEqual({ success: false, error: 'Failed to open folder' });
  });
});
