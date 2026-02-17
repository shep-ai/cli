// @vitest-environment node

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock getSettings
const mockGetSettings = vi.fn();
vi.mock('@shepai/core/infrastructure/services/settings.service', () => ({
  getSettings: mockGetSettings,
}));

// Mock createLauncherRegistry
const mockCheckAvailable = vi.fn<() => Promise<boolean>>();
const mockLaunch = vi.fn<(path: string) => Promise<void>>();
const mockLauncher = {
  name: 'VS Code',
  editorId: 'vscode',
  binary: 'code',
  checkAvailable: mockCheckAvailable,
  launch: mockLaunch,
};
const mockRegistry = new Map([['vscode', mockLauncher]]);
vi.mock('@shepai/core/infrastructure/services/ide-launchers/ide-launcher.registry', () => ({
  createLauncherRegistry: () => mockRegistry,
}));

// Mock computeWorktreePath
vi.mock('@shepai/core/infrastructure/services/ide-launchers/compute-worktree-path', () => ({
  computeWorktreePath: (_repoPath: string, _branch: string) =>
    `/mock/.shep/repos/abc123/wt/feat-test`,
}));

// Import after mocks
const { POST } = await import('../../../../../src/presentation/web/app/api/ide/open/route.js');

function createRequest(body: Record<string, unknown>): Request {
  return new Request('http://localhost/api/ide/open', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/ide/open', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSettings.mockReturnValue({
      environment: { defaultEditor: 'vscode' },
    });
    mockCheckAvailable.mockResolvedValue(true);
    mockLaunch.mockResolvedValue(undefined);
  });

  it('returns 400 for missing repositoryPath', async () => {
    const request = createRequest({ branch: 'main' });
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toContain('repositoryPath');
  });

  it('returns 400 for missing branch', async () => {
    const request = createRequest({ repositoryPath: '/home/user/project' });
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toContain('branch');
  });

  it('returns 400 for relative repositoryPath', async () => {
    const request = createRequest({
      repositoryPath: 'relative/path',
      branch: 'main',
    });
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toContain('absolute');
  });

  it('returns 404 when launcher is not found for editor type', async () => {
    mockGetSettings.mockReturnValue({
      environment: { defaultEditor: 'unknown-editor' },
    });

    const request = createRequest({
      repositoryPath: '/home/user/project',
      branch: 'main',
    });
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toContain('unknown-editor');
  });

  it('returns 404 when launcher.checkAvailable() returns false', async () => {
    mockCheckAvailable.mockResolvedValue(false);

    const request = createRequest({
      repositoryPath: '/home/user/project',
      branch: 'main',
    });
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toContain('not available');
  });

  it('returns 200 with correct payload when launch succeeds', async () => {
    const request = createRequest({
      repositoryPath: '/home/user/project',
      branch: 'feat/test',
    });
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      success: true,
      editor: 'VS Code',
      path: '/mock/.shep/repos/abc123/wt/feat-test',
    });
    expect(mockLaunch).toHaveBeenCalledWith('/mock/.shep/repos/abc123/wt/feat-test');
  });

  it('returns 500 when launcher.launch() throws', async () => {
    mockLaunch.mockRejectedValue(new Error('Failed to spawn process'));

    const request = createRequest({
      repositoryPath: '/home/user/project',
      branch: 'main',
    });
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe('Failed to spawn process');
  });

  it('returns 500 with generic message for non-Error throws', async () => {
    mockLaunch.mockRejectedValue('unexpected');

    const request = createRequest({
      repositoryPath: '/home/user/project',
      branch: 'main',
    });
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe('Failed to open IDE');
  });
});
