// @vitest-environment node

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock getSettings
const mockGetSettings = vi.fn();
vi.mock('@shepai/core/infrastructure/services/settings.service', () => ({
  getSettings: mockGetSettings,
}));

// Mock computeWorktreePath
const MOCK_WORKTREE_PATH = '/mock/.shep/repos/abc123/wt/feat-test';
vi.mock('@shepai/core/infrastructure/services/ide-launchers/compute-worktree-path', () => ({
  computeWorktreePath: () => MOCK_WORKTREE_PATH,
}));

// Mock node:fs
const mockExistsSync = vi.fn<(path: string) => boolean>();
vi.mock('node:fs', () => ({
  existsSync: (path: string) => mockExistsSync(path),
}));

// Mock node:child_process
const mockUnref = vi.fn();
const mockOn = vi.fn();
const mockSpawn = vi.fn();
vi.mock('node:child_process', () => ({
  spawn: (...args: unknown[]) => mockSpawn(...args),
}));

// Store original platform
const originalPlatform = process.platform;

// Import after mocks
const { POST } = await import('../../../../../src/presentation/web/app/api/shell/open/route.js');

function createRequest(body: Record<string, unknown>): Request {
  return new Request('http://localhost/api/shell/open', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/shell/open', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSettings.mockReturnValue({
      environment: { shellPreference: 'zsh' },
    });
    mockExistsSync.mockReturnValue(true);
    mockSpawn.mockReturnValue({ unref: mockUnref, on: mockOn });
    // Reset platform
    Object.defineProperty(process, 'platform', { value: originalPlatform });
  });

  it('returns 400 for invalid inputs', async () => {
    const request = createRequest({ repositoryPath: '', branch: 'main' });
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toContain('repositoryPath');
  });

  it('returns 400 for branch with path traversal', async () => {
    const request = createRequest({
      repositoryPath: '/home/user/project',
      branch: 'feat/../etc/passwd',
    });
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toContain('path traversal');
  });

  it('returns 404 when worktree path does not exist', async () => {
    mockExistsSync.mockReturnValue(false);

    const request = createRequest({
      repositoryPath: '/home/user/project',
      branch: 'main',
    });
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toContain('does not exist');
  });

  it('returns 501 on unsupported platform', async () => {
    Object.defineProperty(process, 'platform', { value: 'win32' });

    const request = createRequest({
      repositoryPath: '/home/user/project',
      branch: 'main',
    });
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(501);
    expect(body.error).toContain('win32');
  });

  it('spawns correct command on darwin', async () => {
    Object.defineProperty(process, 'platform', { value: 'darwin' });

    const request = createRequest({
      repositoryPath: '/home/user/project',
      branch: 'feat/test',
    });
    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(mockSpawn).toHaveBeenCalledWith('open', ['-a', 'Terminal', MOCK_WORKTREE_PATH], {
      detached: true,
      stdio: 'ignore',
    });
    expect(mockUnref).toHaveBeenCalled();
  });

  it('spawns correct command on linux', async () => {
    Object.defineProperty(process, 'platform', { value: 'linux' });

    const request = createRequest({
      repositoryPath: '/home/user/project',
      branch: 'feat/test',
    });
    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(mockSpawn).toHaveBeenCalledWith(
      'x-terminal-emulator',
      [`--working-directory=${MOCK_WORKTREE_PATH}`],
      { detached: true, stdio: 'ignore' }
    );
    expect(mockUnref).toHaveBeenCalled();
  });

  it('returns 200 with correct payload on success', async () => {
    Object.defineProperty(process, 'platform', { value: 'darwin' });
    mockGetSettings.mockReturnValue({
      environment: { shellPreference: 'fish' },
    });

    const request = createRequest({
      repositoryPath: '/home/user/project',
      branch: 'feat/test',
    });
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      success: true,
      path: MOCK_WORKTREE_PATH,
      shell: 'fish',
    });
  });

  it('returns 500 when spawn throws', async () => {
    Object.defineProperty(process, 'platform', { value: 'darwin' });
    mockSpawn.mockImplementation(() => {
      throw new Error('spawn failed');
    });

    const request = createRequest({
      repositoryPath: '/home/user/project',
      branch: 'main',
    });
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe('spawn failed');
  });

  it('returns 500 with generic message for non-Error throws', async () => {
    Object.defineProperty(process, 'platform', { value: 'darwin' });
    mockSpawn.mockImplementation(() => {
      throw 'unexpected';
    });

    const request = createRequest({
      repositoryPath: '/home/user/project',
      branch: 'main',
    });
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe('Failed to open shell');
  });
});
