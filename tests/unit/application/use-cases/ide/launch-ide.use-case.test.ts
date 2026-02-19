/**
 * LaunchIdeUseCase Unit Tests
 *
 * Tests for IDE launch orchestration: worktree path computation,
 * availability checking, and delegation to IIdeLauncherService.
 *
 * TDD Phase: RED-GREEN
 */

import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LaunchIdeUseCase } from '@/application/use-cases/ide/launch-ide.use-case.js';
import type {
  IIdeLauncherService,
  LaunchIdeResult,
} from '@/application/ports/output/services/ide-launcher-service.interface.js';

vi.mock('@/infrastructure/services/ide-launchers/compute-worktree-path.js', () => ({
  computeWorktreePath: vi.fn((_repoPath: string, branch: string) => `/mock/wt/${branch}`),
}));

import { computeWorktreePath } from '@/infrastructure/services/ide-launchers/compute-worktree-path.js';

describe('LaunchIdeUseCase', () => {
  let useCase: LaunchIdeUseCase;
  let mockService: IIdeLauncherService;

  const successResult: LaunchIdeResult = {
    ok: true,
    editorName: 'VS Code',
    worktreePath: '/some/path',
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockService = {
      launch: vi
        .fn<(editorId: string, directoryPath: string) => Promise<LaunchIdeResult>>()
        .mockResolvedValue(successResult),
      checkAvailability: vi.fn<(editorId: string) => Promise<boolean>>().mockResolvedValue(true),
    };

    useCase = new LaunchIdeUseCase(mockService);
  });

  describe('worktree path computation', () => {
    it('should compute worktree path when branch is provided', async () => {
      await useCase.execute({
        editorId: 'vscode',
        repositoryPath: '/repo',
        branch: 'feat/my-feature',
      });

      expect(computeWorktreePath).toHaveBeenCalledWith('/repo', 'feat/my-feature');
      expect(mockService.launch).toHaveBeenCalledWith('vscode', '/mock/wt/feat/my-feature');
    });

    it('should pass repositoryPath directly when branch is not provided', async () => {
      await useCase.execute({
        editorId: 'cursor',
        repositoryPath: '/my/repo',
      });

      expect(computeWorktreePath).not.toHaveBeenCalled();
      expect(mockService.launch).toHaveBeenCalledWith('cursor', '/my/repo');
    });
  });

  describe('availability checking', () => {
    it('should call checkAvailability when checkAvailability is true', async () => {
      await useCase.execute({
        editorId: 'vscode',
        repositoryPath: '/repo',
        checkAvailability: true,
      });

      expect(mockService.checkAvailability).toHaveBeenCalledWith('vscode');
      expect(mockService.launch).toHaveBeenCalled();
    });

    it('should return editor_unavailable when checkAvailability is true and editor is unavailable', async () => {
      vi.mocked(mockService.checkAvailability).mockResolvedValue(false);

      const result = await useCase.execute({
        editorId: 'zed',
        repositoryPath: '/repo',
        checkAvailability: true,
      });

      expect(result).toEqual({
        ok: false,
        code: 'editor_unavailable',
        message: expect.stringContaining('zed'),
      });
      expect(mockService.launch).not.toHaveBeenCalled();
    });

    it('should skip availability check when checkAvailability is false', async () => {
      await useCase.execute({
        editorId: 'vscode',
        repositoryPath: '/repo',
        checkAvailability: false,
      });

      expect(mockService.checkAvailability).not.toHaveBeenCalled();
      expect(mockService.launch).toHaveBeenCalled();
    });

    it('should skip availability check when checkAvailability is undefined', async () => {
      await useCase.execute({
        editorId: 'vscode',
        repositoryPath: '/repo',
      });

      expect(mockService.checkAvailability).not.toHaveBeenCalled();
      expect(mockService.launch).toHaveBeenCalled();
    });
  });

  describe('delegation to service', () => {
    it('should return the LaunchIdeResult from service unchanged', async () => {
      const result = await useCase.execute({
        editorId: 'vscode',
        repositoryPath: '/repo',
      });

      expect(result).toBe(successResult);
    });

    it('should return failure result from service unchanged', async () => {
      const failResult: LaunchIdeResult = {
        ok: false,
        code: 'launch_failed',
        message: 'spawn error',
      };
      vi.mocked(mockService.launch).mockResolvedValue(failResult);

      const result = await useCase.execute({
        editorId: 'vscode',
        repositoryPath: '/repo',
      });

      expect(result).toBe(failResult);
    });
  });
});
