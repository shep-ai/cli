/**
 * StartCodeServerUseCase Unit Tests
 *
 * Tests for code-server instance start orchestration: validates feature exists,
 * checks code-server availability, computes worktree path, and delegates to
 * ICodeServerManagerService.
 *
 * TDD Phase: RED-GREEN
 */

import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StartCodeServerUseCase } from '@/application/use-cases/code-server/start-code-server.use-case.js';
import type { ICodeServerManagerService } from '@/application/ports/output/services/code-server-manager-service.interface.js';
import type { CodeServerStartResult } from '@/application/ports/output/services/code-server-manager-service.interface.js';
import type { IFeatureRepository } from '@/application/ports/output/repositories/feature-repository.interface.js';
import type { IToolInstallerService } from '@/application/ports/output/services/tool-installer.service.js';
import type { Feature, ToolInstallationStatus } from '@/domain/generated/output.js';

vi.mock('@/infrastructure/services/ide-launchers/compute-worktree-path.js', () => ({
  computeWorktreePath: vi.fn((_repoPath: string, branch: string) => `/mock/wt/${branch}`),
}));

import { computeWorktreePath } from '@/infrastructure/services/ide-launchers/compute-worktree-path.js';

describe('StartCodeServerUseCase', () => {
  let useCase: StartCodeServerUseCase;
  let mockFeatureRepository: IFeatureRepository;
  let mockToolInstallerService: IToolInstallerService;
  let mockCodeServerManager: ICodeServerManagerService;

  const mockFeature = {
    id: 'feat-123',
    slug: 'my-feature',
    name: 'My Feature',
    description: 'A test feature',
    userQuery: 'test',
    repositoryPath: '/repo/path',
    branch: 'feat/my-feature',
    lifecycle: 'Requirements' as Feature['lifecycle'],
    messages: [],
    relatedArtifacts: [],
    push: false,
    openPr: false,
    approvalGates: {} as Feature['approvalGates'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } as Feature;

  const mockStartResult: CodeServerStartResult = {
    url: 'http://127.0.0.1:13370',
    port: 13370,
    pid: 12345,
    featureId: 'feat-123',
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockFeatureRepository = {
      findById: vi.fn<(id: string) => Promise<Feature | null>>().mockResolvedValue(mockFeature),
      findByIdPrefix: vi.fn(),
      findBySlug: vi.fn(),
      list: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      findByParentId: vi.fn(),
      delete: vi.fn(),
    };

    mockToolInstallerService = {
      checkAvailability: vi
        .fn<(toolName: string) => Promise<ToolInstallationStatus>>()
        .mockResolvedValue({
          status: 'available',
          toolName: 'code-server',
        }),
      getInstallCommand: vi.fn(),
      executeInstall: vi.fn(),
    };

    mockCodeServerManager = {
      start: vi
        .fn<(featureId: string, worktreePath: string) => Promise<CodeServerStartResult>>()
        .mockResolvedValue(mockStartResult),
      stop: vi.fn(),
      getStatus: vi.fn(),
      listRunning: vi.fn(),
      stopAll: vi.fn(),
      reconcile: vi.fn(),
    };

    useCase = new StartCodeServerUseCase(
      mockFeatureRepository,
      mockToolInstallerService,
      mockCodeServerManager
    );
  });

  describe('successful start', () => {
    it('should return url and port when feature exists and code-server is installed', async () => {
      const result = await useCase.execute({
        featureId: 'feat-123',
        repositoryPath: '/repo/path',
        branch: 'feat/my-feature',
      });

      expect(result).toEqual({
        url: 'http://127.0.0.1:13370',
        port: 13370,
      });
    });

    it('should compute worktree path from repositoryPath and branch', async () => {
      await useCase.execute({
        featureId: 'feat-123',
        repositoryPath: '/repo/path',
        branch: 'feat/my-feature',
      });

      expect(computeWorktreePath).toHaveBeenCalledWith('/repo/path', 'feat/my-feature');
    });

    it('should delegate to manager service with featureId and computed worktree path', async () => {
      await useCase.execute({
        featureId: 'feat-123',
        repositoryPath: '/repo/path',
        branch: 'feat/my-feature',
      });

      expect(mockCodeServerManager.start).toHaveBeenCalledWith(
        'feat-123',
        '/mock/wt/feat/my-feature'
      );
    });
  });

  describe('feature validation', () => {
    it('should throw error when feature is not found', async () => {
      vi.mocked(mockFeatureRepository.findById).mockResolvedValue(null);

      await expect(
        useCase.execute({
          featureId: 'non-existent',
          repositoryPath: '/repo/path',
          branch: 'feat/my-feature',
        })
      ).rejects.toThrow('Feature not found');

      expect(mockCodeServerManager.start).not.toHaveBeenCalled();
    });

    it('should call findById with the provided featureId', async () => {
      await useCase.execute({
        featureId: 'feat-123',
        repositoryPath: '/repo/path',
        branch: 'feat/my-feature',
      });

      expect(mockFeatureRepository.findById).toHaveBeenCalledWith('feat-123');
    });
  });

  describe('tool availability validation', () => {
    it('should throw error when code-server is not installed', async () => {
      vi.mocked(mockToolInstallerService.checkAvailability).mockResolvedValue({
        status: 'missing',
        toolName: 'code-server',
      });

      await expect(
        useCase.execute({
          featureId: 'feat-123',
          repositoryPath: '/repo/path',
          branch: 'feat/my-feature',
        })
      ).rejects.toThrow('code-server is not installed');

      expect(mockCodeServerManager.start).not.toHaveBeenCalled();
    });

    it('should check availability for code-server tool', async () => {
      await useCase.execute({
        featureId: 'feat-123',
        repositoryPath: '/repo/path',
        branch: 'feat/my-feature',
      });

      expect(mockToolInstallerService.checkAvailability).toHaveBeenCalledWith('code-server');
    });
  });
});
