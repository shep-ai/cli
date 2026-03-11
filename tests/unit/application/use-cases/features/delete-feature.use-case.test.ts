/**
 * DeleteFeatureUseCase Unit Tests
 *
 * Tests for deleting a feature by ID, including agent cancellation
 * and worktree cleanup.
 *
 * TDD Phase: RED-GREEN
 */

import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DeleteFeatureUseCase } from '@/application/use-cases/features/delete-feature.use-case.js';
import type { IFeatureRepository } from '@/application/ports/output/repositories/feature-repository.interface.js';
import type { IWorktreeService } from '@/application/ports/output/services/worktree-service.interface.js';
import type { IFeatureAgentProcessService } from '@/application/ports/output/agents/feature-agent-process.interface.js';
import type { IAgentRunRepository } from '@/application/ports/output/agents/agent-run-repository.interface.js';
import type { IGitPrService } from '@/application/ports/output/services/git-pr-service.interface.js';
import { AgentRunStatus, AgentType, SdlcLifecycle } from '@/domain/generated/output.js';
import type { Feature, AgentRun } from '@/domain/generated/output.js';

function createMockFeature(overrides?: Partial<Feature>): Feature {
  return {
    id: 'feat-123-full-uuid',
    name: 'Test Feature',
    slug: 'test-feature',
    description: 'A test feature',
    userQuery: 'test user query',
    repositoryPath: '/repo',
    branch: 'feat/test-feature',
    lifecycle: SdlcLifecycle.Implementation,
    messages: [],
    relatedArtifacts: [],
    fast: false,
    push: false,
    openPr: false,
    approvalGates: { allowPrd: false, allowPlan: false, allowMerge: false },
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function createMockAgentRun(overrides?: Partial<AgentRun>): AgentRun {
  return {
    id: 'run-1',
    agentType: AgentType.ClaudeCode,
    agentName: 'feature-agent',
    status: AgentRunStatus.running,
    prompt: 'test prompt',
    threadId: 'thread-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('DeleteFeatureUseCase', () => {
  let useCase: DeleteFeatureUseCase;
  let mockFeatureRepo: IFeatureRepository;
  let mockWorktreeService: IWorktreeService;
  let mockProcessService: IFeatureAgentProcessService;
  let mockRunRepo: IAgentRunRepository;
  let mockGitPrService: IGitPrService;

  beforeEach(() => {
    mockFeatureRepo = {
      create: vi.fn(),
      findById: vi.fn().mockResolvedValue(createMockFeature()),
      findByIdPrefix: vi.fn().mockResolvedValue(null),
      findBySlug: vi.fn(),
      list: vi.fn(),
      findByParentId: vi.fn().mockResolvedValue([]),
      update: vi.fn(),
      delete: vi.fn(),
      softDelete: vi.fn(),
    };

    mockWorktreeService = {
      create: vi.fn(),
      remove: vi.fn(),
      prune: vi.fn(),
      list: vi.fn(),
      exists: vi.fn(),
      branchExists: vi.fn(),
      remoteBranchExists: vi.fn().mockResolvedValue(false),
      getWorktreePath: vi.fn().mockReturnValue('/repo/.worktrees/feat-test-feature'),
      ensureGitRepository: vi.fn(),
    };

    mockProcessService = {
      spawn: vi.fn(),
      isAlive: vi.fn(),
      checkAndMarkCrashed: vi.fn(),
    };

    mockRunRepo = {
      create: vi.fn(),
      findById: vi.fn().mockResolvedValue(null),
      findByThreadId: vi.fn(),
      updateStatus: vi.fn(),
      findRunningByPid: vi.fn(),
      list: vi.fn(),
      delete: vi.fn(),
    };

    mockGitPrService = {
      getDefaultBranch: vi.fn().mockResolvedValue('main'),
      deleteBranch: vi.fn().mockResolvedValue(undefined),
      getRemoteUrl: vi.fn().mockResolvedValue(null),
      getOpenPrForBranch: vi.fn().mockResolvedValue(null),
      getPrChecks: vi.fn().mockResolvedValue([]),
      mergePr: vi.fn(),
      createPr: vi.fn(),
      getPrDiff: vi.fn(),
      getPrComments: vi.fn().mockResolvedValue([]),
      getMergeableStatus: vi.fn().mockResolvedValue(undefined),
    } as unknown as IGitPrService;

    useCase = new DeleteFeatureUseCase(
      mockFeatureRepo,
      mockWorktreeService,
      mockProcessService,
      mockRunRepo,
      mockGitPrService
    );
  });

  it('should delete a feature successfully with no agent run', async () => {
    const feature = createMockFeature();
    mockFeatureRepo.findById = vi.fn().mockResolvedValue(feature);

    const result = await useCase.execute('feat-123-full-uuid');

    expect(result.id).toBe('feat-123-full-uuid');
    expect(mockWorktreeService.remove).toHaveBeenCalled();
    expect(mockFeatureRepo.softDelete).toHaveBeenCalledWith('feat-123-full-uuid');
  });

  it('should remove worktree directly when cleanup=false', async () => {
    const feature = createMockFeature();
    mockFeatureRepo.findById = vi.fn().mockResolvedValue(feature);

    const result = await useCase.execute('feat-123-full-uuid', { cleanup: false });

    expect(result.id).toBe('feat-123-full-uuid');
    expect(mockWorktreeService.getWorktreePath).toHaveBeenCalledWith('/repo', 'feat/test-feature');
    expect(mockWorktreeService.remove).toHaveBeenCalledWith(
      '/repo/.worktrees/feat-test-feature',
      true
    );
    expect(mockGitPrService.deleteBranch).not.toHaveBeenCalled();
    expect(mockFeatureRepo.softDelete).toHaveBeenCalledWith('feat-123-full-uuid');
  });

  it('should cancel a running agent run before deletion', async () => {
    const feature = createMockFeature({ agentRunId: 'run-1' });
    const run = createMockAgentRun({ status: AgentRunStatus.running });
    mockFeatureRepo.findById = vi.fn().mockResolvedValue(feature);
    mockRunRepo.findById = vi.fn().mockResolvedValue(run);

    await useCase.execute('feat-123-full-uuid');

    expect(mockRunRepo.updateStatus).toHaveBeenCalledWith('run-1', AgentRunStatus.cancelled);
    expect(mockFeatureRepo.softDelete).toHaveBeenCalledWith('feat-123-full-uuid');
  });

  it('should kill the OS process if running agent has a live PID', async () => {
    const feature = createMockFeature({ agentRunId: 'run-1' });
    const run = createMockAgentRun({ status: AgentRunStatus.running, pid: 12345 });
    mockFeatureRepo.findById = vi.fn().mockResolvedValue(feature);
    mockRunRepo.findById = vi.fn().mockResolvedValue(run);
    mockProcessService.isAlive = vi.fn().mockReturnValue(true);
    const killSpy = vi.spyOn(process, 'kill').mockImplementation(() => true);

    await useCase.execute('feat-123-full-uuid');

    expect(mockProcessService.isAlive).toHaveBeenCalledWith(12345);
    expect(killSpy).toHaveBeenCalledWith(12345);
    expect(mockRunRepo.updateStatus).toHaveBeenCalledWith('run-1', AgentRunStatus.cancelled);
    killSpy.mockRestore();
  });

  it('should cancel a pending agent run before deletion', async () => {
    const feature = createMockFeature({ agentRunId: 'run-1' });
    const run = createMockAgentRun({ status: AgentRunStatus.pending });
    mockFeatureRepo.findById = vi.fn().mockResolvedValue(feature);
    mockRunRepo.findById = vi.fn().mockResolvedValue(run);

    await useCase.execute('feat-123-full-uuid');

    expect(mockRunRepo.updateStatus).toHaveBeenCalledWith('run-1', AgentRunStatus.cancelled);
  });

  it('should NOT cancel a completed agent run', async () => {
    const feature = createMockFeature({ agentRunId: 'run-1' });
    const run = createMockAgentRun({ status: AgentRunStatus.completed });
    mockFeatureRepo.findById = vi.fn().mockResolvedValue(feature);
    mockRunRepo.findById = vi.fn().mockResolvedValue(run);

    await useCase.execute('feat-123-full-uuid');

    expect(mockRunRepo.updateStatus).not.toHaveBeenCalled();
    expect(mockFeatureRepo.softDelete).toHaveBeenCalledWith('feat-123-full-uuid');
  });

  it('should throw if feature is not found', async () => {
    mockFeatureRepo.findById = vi.fn().mockResolvedValue(null);
    mockFeatureRepo.findByIdPrefix = vi.fn().mockResolvedValue(null);

    await expect(useCase.execute('non-existent')).rejects.toThrow(/not found/i);
  });

  it('should include the feature id in the error message', async () => {
    mockFeatureRepo.findById = vi.fn().mockResolvedValue(null);
    mockFeatureRepo.findByIdPrefix = vi.fn().mockResolvedValue(null);

    await expect(useCase.execute('abc-123')).rejects.toThrow('abc-123');
  });

  it('should still delete feature if worktree removal fails (cleanup=false)', async () => {
    const feature = createMockFeature();
    mockFeatureRepo.findById = vi.fn().mockResolvedValue(feature);
    mockWorktreeService.remove = vi.fn().mockRejectedValue(new Error('worktree not found'));

    const result = await useCase.execute('feat-123-full-uuid', { cleanup: false });

    expect(result.id).toBe('feat-123-full-uuid');
    expect(mockFeatureRepo.softDelete).toHaveBeenCalledWith('feat-123-full-uuid');
  });

  it('should find feature by prefix match', async () => {
    const feature = createMockFeature();
    mockFeatureRepo.findById = vi.fn().mockResolvedValue(null);
    mockFeatureRepo.findByIdPrefix = vi.fn().mockResolvedValue(feature);

    const result = await useCase.execute('feat-123');

    expect(result.id).toBe('feat-123-full-uuid');
    expect(mockFeatureRepo.findByIdPrefix).toHaveBeenCalledWith('feat-123');
    expect(mockFeatureRepo.softDelete).toHaveBeenCalledWith('feat-123-full-uuid');
  });

  it('should return the deleted feature', async () => {
    const feature = createMockFeature({ name: 'My Feature' });
    mockFeatureRepo.findById = vi.fn().mockResolvedValue(feature);

    const result = await useCase.execute('feat-123-full-uuid');

    expect(result.name).toBe('My Feature');
    expect(result.branch).toBe('feat/test-feature');
  });

  // -------------------------------------------------------------------------
  // Cascade delete — sub-features
  // -------------------------------------------------------------------------

  it('should cascade delete blocked children instead of throwing', async () => {
    const feature = createMockFeature();
    const blockedChild1 = createMockFeature({
      id: 'child-001',
      name: 'Child One',
      lifecycle: SdlcLifecycle.Blocked,
      repositoryPath: '/repo',
      branch: 'feat/child-one',
    });
    const blockedChild2 = createMockFeature({
      id: 'child-002',
      name: 'Child Two',
      lifecycle: SdlcLifecycle.Blocked,
      repositoryPath: '/repo',
      branch: 'feat/child-two',
    });
    mockFeatureRepo.findById = vi.fn().mockResolvedValue(feature);
    // findByParentId is called twice per parent: once for soft-delete, once for cleanup
    mockFeatureRepo.findByParentId = vi.fn().mockImplementation(async (parentId: string) => {
      if (parentId === 'feat-123-full-uuid') return [blockedChild1, blockedChild2];
      return [];
    });

    const result = await useCase.execute('feat-123-full-uuid');

    expect(result.id).toBe('feat-123-full-uuid');
    expect(mockFeatureRepo.softDelete).toHaveBeenCalledWith('child-001');
    expect(mockFeatureRepo.softDelete).toHaveBeenCalledWith('child-002');
    expect(mockFeatureRepo.softDelete).toHaveBeenCalledWith('feat-123-full-uuid');
  });

  it('should cascade delete children in any lifecycle state', async () => {
    const feature = createMockFeature();
    const startedChild = createMockFeature({
      id: 'child-001',
      lifecycle: SdlcLifecycle.Started,
      repositoryPath: '/repo',
      branch: 'feat/child-started',
    });
    mockFeatureRepo.findById = vi.fn().mockResolvedValue(feature);
    mockFeatureRepo.findByParentId = vi.fn().mockImplementation(async (parentId: string) => {
      if (parentId === 'feat-123-full-uuid') return [startedChild];
      return [];
    });

    const result = await useCase.execute('feat-123-full-uuid');

    expect(result.id).toBe('feat-123-full-uuid');
    expect(mockFeatureRepo.softDelete).toHaveBeenCalledWith('child-001');
    expect(mockFeatureRepo.softDelete).toHaveBeenCalledWith('feat-123-full-uuid');
  });

  it('should recursively delete grandchildren', async () => {
    const feature = createMockFeature();
    const child = createMockFeature({
      id: 'child-001',
      name: 'Child',
      lifecycle: SdlcLifecycle.Blocked,
      repositoryPath: '/repo',
      branch: 'feat/child',
    });
    const grandchild = createMockFeature({
      id: 'grandchild-001',
      name: 'Grandchild',
      lifecycle: SdlcLifecycle.Blocked,
      repositoryPath: '/repo',
      branch: 'feat/grandchild',
    });
    mockFeatureRepo.findById = vi.fn().mockResolvedValue(feature);
    mockFeatureRepo.findByParentId = vi.fn().mockImplementation(async (parentId: string) => {
      if (parentId === 'feat-123-full-uuid') return [child];
      if (parentId === 'child-001') return [grandchild];
      return [];
    });

    const result = await useCase.execute('feat-123-full-uuid');

    expect(result.id).toBe('feat-123-full-uuid');
    expect(mockFeatureRepo.softDelete).toHaveBeenCalledWith('grandchild-001');
    expect(mockFeatureRepo.softDelete).toHaveBeenCalledWith('child-001');
    expect(mockFeatureRepo.softDelete).toHaveBeenCalledWith('feat-123-full-uuid');
  });

  it('should cancel agent runs on children during cascade delete', async () => {
    const feature = createMockFeature();
    const child = createMockFeature({
      id: 'child-001',
      agentRunId: 'child-run-1',
      lifecycle: SdlcLifecycle.Started,
      repositoryPath: '/repo',
      branch: 'feat/child',
    });
    const childRun = createMockAgentRun({ id: 'child-run-1', status: AgentRunStatus.running });
    mockFeatureRepo.findById = vi.fn().mockResolvedValue(feature);
    mockFeatureRepo.findByParentId = vi.fn().mockImplementation(async (parentId: string) => {
      if (parentId === 'feat-123-full-uuid') return [child];
      return [];
    });
    mockRunRepo.findById = vi.fn().mockResolvedValue(childRun);

    await useCase.execute('feat-123-full-uuid');

    expect(mockRunRepo.updateStatus).toHaveBeenCalledWith('child-run-1', AgentRunStatus.cancelled);
    expect(mockFeatureRepo.softDelete).toHaveBeenCalledWith('child-001');
  });

  it('should succeed when there are no children at all', async () => {
    const feature = createMockFeature();
    mockFeatureRepo.findById = vi.fn().mockResolvedValue(feature);
    mockFeatureRepo.findByParentId = vi.fn().mockResolvedValue([]);

    const result = await useCase.execute('feat-123-full-uuid');

    expect(result.id).toBe('feat-123-full-uuid');
    expect(mockFeatureRepo.softDelete).toHaveBeenCalledWith('feat-123-full-uuid');
  });

  // -------------------------------------------------------------------------
  // Cleanup option (FR-12 through FR-16)
  // -------------------------------------------------------------------------

  describe('cleanup option', () => {
    it('should delete local and remote branches when cleanup=true', async () => {
      const feature = createMockFeature();
      mockFeatureRepo.findById = vi.fn().mockResolvedValue(feature);
      mockWorktreeService.remoteBranchExists = vi.fn().mockResolvedValue(true);

      await useCase.execute('feat-123-full-uuid', { cleanup: true });

      expect(mockWorktreeService.remove).toHaveBeenCalled();
      expect(mockGitPrService.deleteBranch).toHaveBeenCalledWith('/repo', 'feat/test-feature');
      expect(mockGitPrService.deleteBranch).toHaveBeenCalledWith(
        '/repo',
        'feat/test-feature',
        true
      );
      expect(mockFeatureRepo.softDelete).toHaveBeenCalledWith('feat-123-full-uuid');
    });

    it('should NOT delete branches when cleanup=false', async () => {
      const feature = createMockFeature();
      mockFeatureRepo.findById = vi.fn().mockResolvedValue(feature);

      await useCase.execute('feat-123-full-uuid', { cleanup: false });

      expect(mockGitPrService.deleteBranch).not.toHaveBeenCalled();
      expect(mockWorktreeService.remove).toHaveBeenCalled();
      expect(mockFeatureRepo.softDelete).toHaveBeenCalledWith('feat-123-full-uuid');
    });

    it('should default to cleanup=true when no options provided', async () => {
      const feature = createMockFeature();
      mockFeatureRepo.findById = vi.fn().mockResolvedValue(feature);

      await useCase.execute('feat-123-full-uuid');

      expect(mockGitPrService.deleteBranch).toHaveBeenCalledWith('/repo', 'feat/test-feature');
    });

    it('should still delete feature record even if branch cleanup fails', async () => {
      const feature = createMockFeature();
      mockFeatureRepo.findById = vi.fn().mockResolvedValue(feature);
      (mockGitPrService.deleteBranch as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('branch not found')
      );

      await useCase.execute('feat-123-full-uuid', { cleanup: true });

      expect(mockFeatureRepo.softDelete).toHaveBeenCalledWith('feat-123-full-uuid');
    });

    it('should skip remote branch delete when remote does not exist', async () => {
      const feature = createMockFeature();
      mockFeatureRepo.findById = vi.fn().mockResolvedValue(feature);
      mockWorktreeService.remoteBranchExists = vi.fn().mockResolvedValue(false);

      await useCase.execute('feat-123-full-uuid', { cleanup: true });

      // Only local branch delete — no remote
      expect(mockGitPrService.deleteBranch).toHaveBeenCalledTimes(1);
      expect(mockGitPrService.deleteBranch).toHaveBeenCalledWith('/repo', 'feat/test-feature');
    });
  });
});
