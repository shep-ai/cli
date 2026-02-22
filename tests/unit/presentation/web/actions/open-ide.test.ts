// @vitest-environment node

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetSettings = vi.fn();
vi.mock('@shepai/core/infrastructure/services/settings.service', () => ({
  getSettings: mockGetSettings,
}));

const mockExecute = vi.fn();
vi.mock('@/lib/server-container', () => ({
  resolve: () => ({ execute: mockExecute }),
}));

const { openIde } = await import('../../../../../src/presentation/web/app/actions/open-ide.js');

describe('openIde server action', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSettings.mockReturnValue({
      environment: { defaultEditor: 'vscode' },
    });
    mockExecute.mockResolvedValue({
      ok: true,
      editorName: 'VS Code',
      worktreePath: '/mock/.shep/repos/abc123/wt/feat-test',
    });
  });

  it('returns error for missing repositoryPath', async () => {
    const result = await openIde({ repositoryPath: '', branch: 'main' });

    expect(result).toEqual({
      success: false,
      error: 'repositoryPath must be an absolute path',
    });
  });

  it('returns error for relative repositoryPath', async () => {
    const result = await openIde({ repositoryPath: 'relative/path', branch: 'main' });

    expect(result).toEqual({
      success: false,
      error: 'repositoryPath must be an absolute path',
    });
  });

  it('calls use case without branch when branch is not provided', async () => {
    await openIde({ repositoryPath: '/home/user/project' });

    expect(mockExecute).toHaveBeenCalledWith({
      editorId: 'vscode',
      repositoryPath: '/home/user/project',
      branch: undefined,
      checkAvailability: true,
    });
  });

  it('returns success when branch is not provided', async () => {
    const result = await openIde({ repositoryPath: '/home/user/project' });

    expect(result).toEqual({
      success: true,
      editor: 'VS Code',
      path: '/mock/.shep/repos/abc123/wt/feat-test',
    });
  });

  it('calls use case with branch and checkAvailability', async () => {
    await openIde({ repositoryPath: '/home/user/project', branch: 'main' });

    expect(mockExecute).toHaveBeenCalledWith({
      editorId: 'vscode',
      repositoryPath: '/home/user/project',
      branch: 'main',
      checkAvailability: true,
    });
  });

  it('returns error when use case returns unknown_editor', async () => {
    mockGetSettings.mockReturnValue({
      environment: { defaultEditor: 'unknown-editor' },
    });
    mockExecute.mockResolvedValue({
      ok: false,
      code: 'unknown_editor',
      message: 'No launcher found for editor: unknown-editor',
    });

    const result = await openIde({ repositoryPath: '/home/user/project', branch: 'main' });

    expect(result.success).toBe(false);
    expect(result.error).toContain('unknown-editor');
  });

  it('returns success with correct payload when launch succeeds', async () => {
    const result = await openIde({
      repositoryPath: '/home/user/project',
      branch: 'feat/test',
    });

    expect(result).toEqual({
      success: true,
      editor: 'VS Code',
      path: '/mock/.shep/repos/abc123/wt/feat-test',
    });
  });

  it('returns error when use case returns launch_failed', async () => {
    mockExecute.mockResolvedValue({
      ok: false,
      code: 'launch_failed',
      message: 'Failed to spawn process',
    });

    const result = await openIde({ repositoryPath: '/home/user/project', branch: 'main' });

    expect(result).toEqual({
      success: false,
      error: 'Failed to spawn process',
    });
  });
});
