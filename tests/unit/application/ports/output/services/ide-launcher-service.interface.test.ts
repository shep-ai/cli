import { describe, it, expect } from 'vitest';

import type {
  IIdeLauncherService,
  LaunchIdeInput,
  LaunchIdeResult,
  LaunchIdeSuccess,
  LaunchIdeFailed,
} from '@/application/ports/output/services/ide-launcher-service.interface';

describe('LaunchIdeResult', () => {
  it('should represent a successful launch', () => {
    const success: LaunchIdeSuccess = {
      ok: true,
      editorName: 'VS Code',
      worktreePath: '/repo/.worktrees/feat-branch',
    };
    const result: LaunchIdeResult = success;
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.editorName).toBe('VS Code');
      expect(result.worktreePath).toBe('/repo/.worktrees/feat-branch');
    }
  });

  it('should represent an unknown_editor failure', () => {
    const failed: LaunchIdeFailed = {
      ok: false,
      code: 'unknown_editor',
      message: 'No launcher found for editor: foo',
    };
    const result: LaunchIdeResult = failed;
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('unknown_editor');
      expect(result.message).toContain('foo');
    }
  });

  it('should represent an editor_unavailable failure', () => {
    const failed: LaunchIdeFailed = {
      ok: false,
      code: 'editor_unavailable',
      message: 'VS Code is not available',
    };
    const result: LaunchIdeResult = failed;
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('editor_unavailable');
    }
  });

  it('should represent a launch_failed failure', () => {
    const failed: LaunchIdeFailed = {
      ok: false,
      code: 'launch_failed',
      message: 'spawn error',
    };
    const result: LaunchIdeResult = failed;
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('launch_failed');
    }
  });
});

describe('LaunchIdeInput', () => {
  it('should accept all required and optional fields', () => {
    const input: LaunchIdeInput = {
      editorId: 'vscode',
      repositoryPath: '/home/user/repo',
      branch: 'feat/my-feature',
      checkAvailability: true,
    };
    expect(input.editorId).toBe('vscode');
    expect(input.repositoryPath).toBe('/home/user/repo');
    expect(input.branch).toBe('feat/my-feature');
    expect(input.checkAvailability).toBe(true);
  });

  it('should allow optional fields to be omitted', () => {
    const input: LaunchIdeInput = {
      editorId: 'cursor',
      repositoryPath: '/home/user/repo',
    };
    expect(input.branch).toBeUndefined();
    expect(input.checkAvailability).toBeUndefined();
  });
});

describe('IIdeLauncherService', () => {
  it('should be implementable with launch and checkAvailability methods', () => {
    const mock: IIdeLauncherService = {
      launch: async () => ({
        ok: true,
        editorName: 'VS Code',
        worktreePath: '/repo',
      }),
      checkAvailability: async () => true,
    };

    const methodNames: (keyof IIdeLauncherService)[] = ['launch', 'checkAvailability'];

    expect(methodNames).toHaveLength(2);
    for (const name of methodNames) {
      expect(typeof mock[name]).toBe('function');
    }
  });
});
