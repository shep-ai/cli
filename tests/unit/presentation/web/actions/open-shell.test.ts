// @vitest-environment node

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetSettings = vi.fn();
vi.mock('@shepai/core/infrastructure/services/settings.service', () => ({
  getSettings: mockGetSettings,
}));

const MOCK_WORKTREE_PATH = '/mock/.shep/repos/abc123/wt/feat-test';
vi.mock('@shepai/core/infrastructure/services/ide-launchers/compute-worktree-path', () => ({
  computeWorktreePath: () => MOCK_WORKTREE_PATH,
}));

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

const { openShell } = await import('../../../../../src/presentation/web/app/actions/open-shell.js');

describe('openShell server action', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSettings.mockReturnValue({
      environment: { shellPreference: 'zsh' },
    });
    mockExistsSync.mockReturnValue(true);
    mockSpawn.mockReturnValue({ unref: mockUnref });
    Object.defineProperty(process, 'platform', { value: originalPlatform });
  });

  it('returns error for invalid repositoryPath', async () => {
    const result = await openShell({ repositoryPath: '', branch: 'main' });

    expect(result).toEqual({
      success: false,
      error: 'repositoryPath must be an absolute path',
    });
  });

  it('returns error when worktree path does not exist', async () => {
    mockExistsSync.mockReturnValue(false);

    const result = await openShell({ repositoryPath: '/home/user/project', branch: 'main' });

    expect(result.success).toBe(false);
    expect(result.error).toContain('does not exist');
  });

  it('returns error on unsupported platform', async () => {
    Object.defineProperty(process, 'platform', { value: 'win32' });

    const result = await openShell({ repositoryPath: '/home/user/project', branch: 'main' });

    expect(result.success).toBe(false);
    expect(result.error).toContain('win32');
  });

  it('spawns correct command on darwin', async () => {
    Object.defineProperty(process, 'platform', { value: 'darwin' });

    const result = await openShell({ repositoryPath: '/home/user/project', branch: 'feat/test' });

    expect(result.success).toBe(true);
    expect(mockSpawn).toHaveBeenCalledWith('open', ['-a', 'Terminal', MOCK_WORKTREE_PATH], {
      detached: true,
      stdio: 'ignore',
    });
    expect(mockUnref).toHaveBeenCalled();
  });

  it('spawns correct command on linux', async () => {
    Object.defineProperty(process, 'platform', { value: 'linux' });

    const result = await openShell({ repositoryPath: '/home/user/project', branch: 'feat/test' });

    expect(result.success).toBe(true);
    expect(mockSpawn).toHaveBeenCalledWith(
      'x-terminal-emulator',
      [`--working-directory=${MOCK_WORKTREE_PATH}`],
      { detached: true, stdio: 'ignore' }
    );
    expect(mockUnref).toHaveBeenCalled();
  });

  it('returns success with correct payload', async () => {
    Object.defineProperty(process, 'platform', { value: 'darwin' });
    mockGetSettings.mockReturnValue({
      environment: { shellPreference: 'fish' },
    });

    const result = await openShell({ repositoryPath: '/home/user/project', branch: 'feat/test' });

    expect(result).toEqual({
      success: true,
      path: MOCK_WORKTREE_PATH,
      shell: 'fish',
    });
  });

  it('returns error when spawn throws', async () => {
    Object.defineProperty(process, 'platform', { value: 'darwin' });
    mockSpawn.mockImplementation(() => {
      throw new Error('spawn failed');
    });

    const result = await openShell({ repositoryPath: '/home/user/project', branch: 'main' });

    expect(result).toEqual({ success: false, error: 'spawn failed' });
  });

  it('returns generic error for non-Error throws', async () => {
    Object.defineProperty(process, 'platform', { value: 'darwin' });
    mockSpawn.mockImplementation(() => {
      throw 'unexpected';
    });

    const result = await openShell({ repositoryPath: '/home/user/project', branch: 'main' });

    expect(result).toEqual({ success: false, error: 'Failed to open shell' });
  });

  it('uses repositoryPath directly when branch is not provided', async () => {
    Object.defineProperty(process, 'platform', { value: 'darwin' });

    const result = await openShell({ repositoryPath: '/home/user/project' });

    expect(result.success).toBe(true);
    expect(mockSpawn).toHaveBeenCalledWith('open', ['-a', 'Terminal', '/home/user/project'], {
      detached: true,
      stdio: 'ignore',
    });
    expect(result.path).toBe('/home/user/project');
  });

  it('returns error when repositoryPath does not exist and no branch provided', async () => {
    Object.defineProperty(process, 'platform', { value: 'darwin' });
    mockExistsSync.mockReturnValue(false);

    const result = await openShell({ repositoryPath: '/nonexistent' });

    expect(result.success).toBe(false);
    expect(result.error).toContain('does not exist');
  });
});
