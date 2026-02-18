// @vitest-environment node

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EditorType } from '@/domain/generated/output';

// Mock the registry and worktree path utilities
const mockLaunch = vi.fn<(path: string) => Promise<void>>();
const mockCheckAvailable = vi.fn<() => Promise<boolean>>();
const mockLauncher = {
  name: 'VS Code',
  editorId: EditorType.VsCode,
  binary: 'code',
  launch: mockLaunch,
  checkAvailable: mockCheckAvailable,
};

vi.mock('@/infrastructure/services/ide-launchers/ide-launcher.registry', () => ({
  createLauncherRegistry: () => new Map([[EditorType.VsCode, mockLauncher]]),
}));

vi.mock('@/infrastructure/services/ide-launchers/compute-worktree-path', () => ({
  computeWorktreePath: (_repoPath: string, _branch: string) =>
    '/mock/.shep/repos/abc123/wt/feat-test',
}));

import { launchIde } from '@/infrastructure/services/ide-launchers/launch-ide';

describe('launchIde', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLaunch.mockResolvedValue(undefined);
    mockCheckAvailable.mockResolvedValue(true);
  });

  it('returns unknown_editor when editor is not in registry', async () => {
    const result = await launchIde({
      editorId: 'notepad' as EditorType,
      repositoryPath: '/home/user/project',
      branch: 'main',
    });

    expect(result).toEqual({
      ok: false,
      code: 'unknown_editor',
      message: expect.stringContaining('notepad'),
    });
  });

  it('returns editor_unavailable when checkAvailability is true and binary is missing', async () => {
    mockCheckAvailable.mockResolvedValue(false);

    const result = await launchIde({
      editorId: EditorType.VsCode,
      repositoryPath: '/home/user/project',
      branch: 'main',
      checkAvailability: true,
    });

    expect(result).toEqual({
      ok: false,
      code: 'editor_unavailable',
      message: expect.stringContaining('not available'),
    });
    expect(mockCheckAvailable).toHaveBeenCalled();
  });

  it('does not call checkAvailable when checkAvailability is omitted', async () => {
    const result = await launchIde({
      editorId: EditorType.VsCode,
      repositoryPath: '/home/user/project',
      branch: 'main',
    });

    expect(result.ok).toBe(true);
    expect(mockCheckAvailable).not.toHaveBeenCalled();
  });

  it('returns success with editorName and worktreePath on successful launch', async () => {
    const result = await launchIde({
      editorId: EditorType.VsCode,
      repositoryPath: '/home/user/project',
      branch: 'feat/test',
    });

    expect(result).toEqual({
      ok: true,
      editorName: 'VS Code',
      worktreePath: '/mock/.shep/repos/abc123/wt/feat-test',
    });
    expect(mockLaunch).toHaveBeenCalledWith('/mock/.shep/repos/abc123/wt/feat-test');
  });

  it('returns launch_failed when launcher.launch() throws', async () => {
    mockLaunch.mockRejectedValue(new Error('Failed to spawn process'));

    const result = await launchIde({
      editorId: EditorType.VsCode,
      repositoryPath: '/home/user/project',
      branch: 'main',
    });

    expect(result).toEqual({
      ok: false,
      code: 'launch_failed',
      message: 'Failed to spawn process',
    });
  });

  it('returns generic message for non-Error throws', async () => {
    mockLaunch.mockRejectedValue('unexpected');

    const result = await launchIde({
      editorId: EditorType.VsCode,
      repositoryPath: '/home/user/project',
      branch: 'main',
    });

    expect(result).toEqual({
      ok: false,
      code: 'launch_failed',
      message: 'Failed to launch IDE',
    });
  });
});
