// @vitest-environment node

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock getSettings
const mockGetSettings = vi.fn();
vi.mock('@shepai/core/infrastructure/services/settings.service', () => ({
  getSettings: mockGetSettings,
}));

// Mock resolve from server-container
const mockLaunchIdeExecute = vi.fn();
vi.mock('../../../../../src/presentation/web/lib/server-container.js', () => ({
  resolve: vi.fn(() => ({ execute: mockLaunchIdeExecute })),
}));

// Import after mocks
const { POST } = await import('../../../../../src/presentation/web/app/api/ide/open/route.js');
import { resolve } from '../../../../../src/presentation/web/lib/server-container.js';

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
    mockLaunchIdeExecute.mockResolvedValue({
      ok: true,
      editorName: 'VS Code',
      worktreePath: '/mock/.shep/repos/abc123/wt/feat-test',
    });
  });

  it('returns 400 for missing repositoryPath', async () => {
    const request = createRequest({ branch: 'main' });
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toContain('repositoryPath');
  });

  it('calls LaunchIdeUseCase.execute without branch when branch is not provided', async () => {
    const request = createRequest({ repositoryPath: '/home/user/project' });
    await POST(request);

    expect(mockLaunchIdeExecute).toHaveBeenCalledWith({
      editorId: 'vscode',
      repositoryPath: '/home/user/project',
      branch: undefined,
      checkAvailability: true,
    });
  });

  it('resolves LaunchIdeUseCase via string token', async () => {
    const request = createRequest({ repositoryPath: '/home/user/project' });
    await POST(request);

    expect(resolve).toHaveBeenCalledWith('LaunchIdeUseCase');
  });

  it('returns 200 with success when branch is not provided', async () => {
    const request = createRequest({ repositoryPath: '/home/user/project' });
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      success: true,
      editor: 'VS Code',
      path: '/mock/.shep/repos/abc123/wt/feat-test',
    });
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

  it('calls LaunchIdeUseCase.execute with checkAvailability true', async () => {
    const request = createRequest({
      repositoryPath: '/home/user/project',
      branch: 'main',
    });
    await POST(request);

    expect(mockLaunchIdeExecute).toHaveBeenCalledWith({
      editorId: 'vscode',
      repositoryPath: '/home/user/project',
      branch: 'main',
      checkAvailability: true,
    });
  });

  it('returns 404 when use case returns unknown_editor', async () => {
    mockGetSettings.mockReturnValue({
      environment: { defaultEditor: 'unknown-editor' },
    });
    mockLaunchIdeExecute.mockResolvedValue({
      ok: false,
      code: 'unknown_editor',
      message: 'No launcher found for editor: unknown-editor',
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

  it('returns 404 when use case returns editor_unavailable', async () => {
    mockLaunchIdeExecute.mockResolvedValue({
      ok: false,
      code: 'editor_unavailable',
      message: 'VS Code is not available — ensure "code" is installed and on your PATH',
    });

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
  });

  it('returns 500 when use case returns launch_failed', async () => {
    mockLaunchIdeExecute.mockResolvedValue({
      ok: false,
      code: 'launch_failed',
      message: 'Failed to spawn process',
    });

    const request = createRequest({
      repositoryPath: '/home/user/project',
      branch: 'main',
    });
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe('Failed to spawn process');
  });
});
