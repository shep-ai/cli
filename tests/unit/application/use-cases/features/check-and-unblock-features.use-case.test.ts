/**
 * CheckAndUnblockFeaturesUseCase Unit Tests
 *
 * Verifies idempotent auto-unblocking behaviour:
 * - No-op when parent lifecycle is below Implementation gate
 * - No-op when no blocked children exist
 * - Transitions Blocked children to Started and calls spawn()
 * - Does not touch non-Blocked children
 * - Idempotent: second call finds no blocked children → spawn() called once total
 *
 * TDD Phase: RED-GREEN-REFACTOR
 */

import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CheckAndUnblockFeaturesUseCase } from '@/application/use-cases/features/check-and-unblock-features.use-case.js';
import type { IFeatureRepository } from '@/application/ports/output/repositories/feature-repository.interface.js';
import type { IFeatureAgentProcessService } from '@/application/ports/output/agents/feature-agent-process.interface.js';
import type { IGitPrService } from '@/application/ports/output/services/git-pr-service.interface.js';
import type { IWorktreeService } from '@/application/ports/output/services/worktree-service.interface.js';
import { SdlcLifecycle } from '@/domain/generated/output.js';
import type { Feature } from '@/domain/generated/output.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeFeature(overrides?: Partial<Feature>): Feature {
  return {
    id: 'feat-001',
    name: 'Test Feature',
    slug: 'test-feature',
    description: 'A test feature',
    userQuery: 'test query',
    repositoryPath: '/repo',
    branch: 'feat/test-feature',
    lifecycle: SdlcLifecycle.Implementation,
    messages: [],
    relatedArtifacts: [],
    fast: false,
    push: false,
    openPr: false,
    forkAndPr: false,
    commitSpecs: true,
    ciWatchEnabled: true,
    enableEvidence: false,
    commitEvidence: false,
    approvalGates: { allowPrd: false, allowPlan: false, allowMerge: false },
    agentRunId: 'run-001',
    specPath: '/repo/.shep/specs/001-test-feature',
    worktreePath: '/worktrees/test-feature',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Test Suite
// ---------------------------------------------------------------------------

describe('CheckAndUnblockFeaturesUseCase', () => {
  let useCase: CheckAndUnblockFeaturesUseCase;
  let mockFeatureRepo: IFeatureRepository;
  let mockAgentProcess: IFeatureAgentProcessService;
  let mockGitPrService: IGitPrService;
  let mockWorktreeService: IWorktreeService;

  const parentId = 'parent-001';

  beforeEach(() => {
    mockFeatureRepo = {
      create: vi.fn(),
      findById: vi.fn(),
      findByIdPrefix: vi.fn(),
      findBySlug: vi.fn(),
      findByBranch: vi.fn(),
      list: vi.fn(),
      findByParentId: vi.fn().mockResolvedValue([]),
      update: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn(),
      softDelete: vi.fn(),
    };

    mockAgentProcess = {
      spawn: vi.fn().mockReturnValue(1234),
      isAlive: vi.fn(),
      checkAndMarkCrashed: vi.fn(),
    };

    mockGitPrService = {
      rebaseOnMain: vi.fn().mockResolvedValue(undefined),
      syncMain: vi.fn().mockResolvedValue(undefined),
      getDefaultBranch: vi.fn().mockResolvedValue('main'),
      hasRemote: vi.fn().mockResolvedValue(true),
      getRemoteUrl: vi.fn().mockResolvedValue(null),
      revParse: vi.fn().mockResolvedValue('abc123'),
      hasUncommittedChanges: vi.fn().mockResolvedValue(false),
      commitAll: vi.fn().mockResolvedValue('abc123'),
      push: vi.fn().mockResolvedValue(undefined),
      createPr: vi.fn().mockResolvedValue({ url: '', number: 1 }),
      mergePr: vi.fn().mockResolvedValue(undefined),
      mergeBranch: vi.fn().mockResolvedValue(undefined),
      getCiStatus: vi.fn().mockResolvedValue({ status: 'success' }),
      watchCi: vi.fn().mockResolvedValue({ status: 'success' }),
      deleteBranch: vi.fn().mockResolvedValue(undefined),
      getPrDiffSummary: vi
        .fn()
        .mockResolvedValue({ filesChanged: 0, additions: 0, deletions: 0, commitCount: 0 }),
      getFileDiffs: vi.fn().mockResolvedValue([]),
      listPrStatuses: vi.fn().mockResolvedValue([]),
      verifyMerge: vi.fn().mockResolvedValue(true),
      localMergeSquash: vi.fn().mockResolvedValue(undefined),
      getMergeableStatus: vi.fn().mockResolvedValue(true),
      getFailureLogs: vi.fn().mockResolvedValue(''),
      getConflictedFiles: vi.fn().mockResolvedValue([]),
      stageFiles: vi.fn().mockResolvedValue(undefined),
      rebaseContinue: vi.fn().mockResolvedValue(undefined),
      rebaseAbort: vi.fn().mockResolvedValue(undefined),
      stash: vi.fn().mockResolvedValue(false),
      stashPop: vi.fn().mockResolvedValue(undefined),
      getBranchSyncStatus: vi.fn().mockResolvedValue({ ahead: 0, behind: 0 }),
    } as unknown as IGitPrService;

    mockWorktreeService = {
      exists: vi.fn().mockResolvedValue(true),
      getWorktreePath: vi.fn().mockReturnValue('/worktrees/test-feature'),
      create: vi.fn().mockResolvedValue(undefined),
      remove: vi.fn().mockResolvedValue(undefined),
      ensureGitRepository: vi.fn().mockResolvedValue(undefined),
    } as unknown as IWorktreeService;

    useCase = new CheckAndUnblockFeaturesUseCase(
      mockFeatureRepo,
      mockAgentProcess,
      mockGitPrService,
      mockWorktreeService
    );
  });

  // -------------------------------------------------------------------------
  // Gate checks — parent not in POST_IMPLEMENTATION
  // -------------------------------------------------------------------------

  it('should be a no-op when parent is not found', async () => {
    mockFeatureRepo.findById = vi.fn().mockResolvedValue(null);

    await useCase.execute(parentId);

    expect(mockFeatureRepo.findByParentId).not.toHaveBeenCalled();
    expect(mockAgentProcess.spawn).not.toHaveBeenCalled();
  });

  it('should be a no-op when parent lifecycle is Planning (below Implementation gate)', async () => {
    const parent = makeFeature({ id: parentId, lifecycle: SdlcLifecycle.Planning });
    mockFeatureRepo.findById = vi.fn().mockResolvedValue(parent);

    await useCase.execute(parentId);

    expect(mockFeatureRepo.findByParentId).not.toHaveBeenCalled();
    expect(mockAgentProcess.spawn).not.toHaveBeenCalled();
  });

  it('should be a no-op when parent lifecycle is Started (below gate)', async () => {
    const parent = makeFeature({ id: parentId, lifecycle: SdlcLifecycle.Started });
    mockFeatureRepo.findById = vi.fn().mockResolvedValue(parent);

    await useCase.execute(parentId);

    expect(mockFeatureRepo.findByParentId).not.toHaveBeenCalled();
    expect(mockAgentProcess.spawn).not.toHaveBeenCalled();
  });

  it('should be a no-op when parent lifecycle is Blocked', async () => {
    const parent = makeFeature({ id: parentId, lifecycle: SdlcLifecycle.Blocked });
    mockFeatureRepo.findById = vi.fn().mockResolvedValue(parent);

    await useCase.execute(parentId);

    expect(mockFeatureRepo.findByParentId).not.toHaveBeenCalled();
    expect(mockAgentProcess.spawn).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // Gate satisfied — no blocked children
  // -------------------------------------------------------------------------

  it('should be a no-op when parent lifecycle is Implementation but no blocked children', async () => {
    const parent = makeFeature({ id: parentId, lifecycle: SdlcLifecycle.Implementation });
    const startedChild = makeFeature({ id: 'child-001', lifecycle: SdlcLifecycle.Started });
    mockFeatureRepo.findById = vi.fn().mockResolvedValue(parent);
    mockFeatureRepo.findByParentId = vi.fn().mockResolvedValue([startedChild]);

    await useCase.execute(parentId);

    expect(mockFeatureRepo.update).not.toHaveBeenCalled();
    expect(mockAgentProcess.spawn).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // Gate satisfied — blocked children present
  // -------------------------------------------------------------------------

  it('should unblock a single blocked child when parent reaches Implementation', async () => {
    const parent = makeFeature({ id: parentId, lifecycle: SdlcLifecycle.Implementation });
    const blockedChild = makeFeature({ id: 'child-001', lifecycle: SdlcLifecycle.Blocked });
    mockFeatureRepo.findById = vi.fn().mockResolvedValue(parent);
    mockFeatureRepo.findByParentId = vi.fn().mockResolvedValue([blockedChild]);

    await useCase.execute(parentId);

    expect(mockFeatureRepo.update).toHaveBeenCalledOnce();
    const updatedFeature = (mockFeatureRepo.update as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(updatedFeature.id).toBe('child-001');
    expect(updatedFeature.lifecycle).toBe(SdlcLifecycle.Started);

    expect(mockAgentProcess.spawn).toHaveBeenCalledOnce();
    expect(mockAgentProcess.spawn).toHaveBeenCalledWith(
      'child-001',
      blockedChild.agentRunId,
      blockedChild.repositoryPath,
      blockedChild.specPath,
      blockedChild.worktreePath,
      {
        approvalGates: blockedChild.approvalGates,
        push: blockedChild.push,
        openPr: blockedChild.openPr,
        forkAndPr: blockedChild.forkAndPr,
        commitSpecs: blockedChild.commitSpecs,
        ciWatchEnabled: blockedChild.ciWatchEnabled,
        enableEvidence: blockedChild.enableEvidence,
        commitEvidence: blockedChild.commitEvidence,
      }
    );
  });

  it('should unblock two blocked children when parent reaches Implementation', async () => {
    const parent = makeFeature({ id: parentId, lifecycle: SdlcLifecycle.Implementation });
    const child1 = makeFeature({
      id: 'child-001',
      lifecycle: SdlcLifecycle.Blocked,
      agentRunId: 'run-1',
      specPath: '/specs/1',
    });
    const child2 = makeFeature({
      id: 'child-002',
      lifecycle: SdlcLifecycle.Blocked,
      agentRunId: 'run-2',
      specPath: '/specs/2',
    });
    mockFeatureRepo.findById = vi.fn().mockResolvedValue(parent);
    mockFeatureRepo.findByParentId = vi.fn().mockResolvedValue([child1, child2]);

    await useCase.execute(parentId);

    expect(mockFeatureRepo.update).toHaveBeenCalledTimes(2);
    expect(mockAgentProcess.spawn).toHaveBeenCalledTimes(2);

    const updatedIds = (mockFeatureRepo.update as ReturnType<typeof vi.fn>).mock.calls.map(
      (call: unknown[]) => (call[0] as Feature).id
    );
    expect(updatedIds).toContain('child-001');
    expect(updatedIds).toContain('child-002');
  });

  it('should only unblock blocked children, not already-started children', async () => {
    const parent = makeFeature({ id: parentId, lifecycle: SdlcLifecycle.Implementation });
    const blockedChild = makeFeature({ id: 'blocked', lifecycle: SdlcLifecycle.Blocked });
    const startedChild = makeFeature({ id: 'started', lifecycle: SdlcLifecycle.Started });
    mockFeatureRepo.findById = vi.fn().mockResolvedValue(parent);
    mockFeatureRepo.findByParentId = vi.fn().mockResolvedValue([blockedChild, startedChild]);

    await useCase.execute(parentId);

    expect(mockFeatureRepo.update).toHaveBeenCalledOnce();
    const updatedFeature = (mockFeatureRepo.update as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(updatedFeature.id).toBe('blocked');
    expect(updatedFeature.lifecycle).toBe(SdlcLifecycle.Started);

    expect(mockAgentProcess.spawn).toHaveBeenCalledOnce();
  });

  it('should work when parent lifecycle is Review (also in POST_IMPLEMENTATION)', async () => {
    const parent = makeFeature({ id: parentId, lifecycle: SdlcLifecycle.Review });
    const blockedChild = makeFeature({ id: 'child-001', lifecycle: SdlcLifecycle.Blocked });
    mockFeatureRepo.findById = vi.fn().mockResolvedValue(parent);
    mockFeatureRepo.findByParentId = vi.fn().mockResolvedValue([blockedChild]);

    await useCase.execute(parentId);

    expect(mockAgentProcess.spawn).toHaveBeenCalledOnce();
  });

  it('should work when parent lifecycle is Maintain (also in POST_IMPLEMENTATION)', async () => {
    const parent = makeFeature({ id: parentId, lifecycle: SdlcLifecycle.Maintain });
    const blockedChild = makeFeature({ id: 'child-001', lifecycle: SdlcLifecycle.Blocked });
    mockFeatureRepo.findById = vi.fn().mockResolvedValue(parent);
    mockFeatureRepo.findByParentId = vi.fn().mockResolvedValue([blockedChild]);

    await useCase.execute(parentId);

    expect(mockAgentProcess.spawn).toHaveBeenCalledOnce();
  });

  // -------------------------------------------------------------------------
  // Idempotency
  // -------------------------------------------------------------------------

  it('should be idempotent: second call finds no blocked children, spawn called once total', async () => {
    const parent = makeFeature({ id: parentId, lifecycle: SdlcLifecycle.Implementation });
    const blockedChild = makeFeature({ id: 'child-001', lifecycle: SdlcLifecycle.Blocked });

    // First call: one blocked child
    mockFeatureRepo.findById = vi.fn().mockResolvedValue(parent);
    mockFeatureRepo.findByParentId = vi
      .fn()
      .mockResolvedValueOnce([blockedChild]) // first call: blocked child exists
      .mockResolvedValueOnce([{ ...blockedChild, lifecycle: SdlcLifecycle.Started }]); // second call: already started

    await useCase.execute(parentId);
    await useCase.execute(parentId);

    // spawn() called exactly once (on the first call only)
    expect(mockAgentProcess.spawn).toHaveBeenCalledOnce();
    // update called exactly once (on the first call only)
    expect(mockFeatureRepo.update).toHaveBeenCalledOnce();
  });

  // -------------------------------------------------------------------------
  // Spawn call uses correct feature fields
  // -------------------------------------------------------------------------

  it('should call spawn() with the correct feature fields from the blocked child', async () => {
    const parent = makeFeature({ id: parentId, lifecycle: SdlcLifecycle.Implementation });
    const blockedChild = makeFeature({
      id: 'child-abc',
      lifecycle: SdlcLifecycle.Blocked,
      agentRunId: 'run-xyz',
      repositoryPath: '/my-repo',
      specPath: '/my-repo/specs/001-child',
      worktreePath: '/my-repo/.worktrees/child',
    });
    mockFeatureRepo.findById = vi.fn().mockResolvedValue(parent);
    mockFeatureRepo.findByParentId = vi.fn().mockResolvedValue([blockedChild]);

    await useCase.execute(parentId);

    expect(mockAgentProcess.spawn).toHaveBeenCalledWith(
      'child-abc',
      'run-xyz',
      '/my-repo',
      '/my-repo/specs/001-child',
      '/my-repo/.worktrees/child',
      {
        approvalGates: blockedChild.approvalGates,
        push: blockedChild.push,
        openPr: blockedChild.openPr,
        forkAndPr: blockedChild.forkAndPr,
        commitSpecs: blockedChild.commitSpecs,
        ciWatchEnabled: blockedChild.ciWatchEnabled,
        enableEvidence: blockedChild.enableEvidence,
        commitEvidence: blockedChild.commitEvidence,
      }
    );
  });

  it('should skip spawn() for a blocked child that has no agentRunId or specPath', async () => {
    const parent = makeFeature({ id: parentId, lifecycle: SdlcLifecycle.Implementation });
    const incompleteChild = makeFeature({
      id: 'child-no-run',
      lifecycle: SdlcLifecycle.Blocked,
      agentRunId: undefined,
      specPath: undefined,
    });
    mockFeatureRepo.findById = vi.fn().mockResolvedValue(parent);
    mockFeatureRepo.findByParentId = vi.fn().mockResolvedValue([incompleteChild]);

    await useCase.execute(parentId);

    // Should still update lifecycle but NOT call spawn
    expect(mockFeatureRepo.update).toHaveBeenCalledOnce();
    expect(mockAgentProcess.spawn).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // Auto-rebase onto parent branch
  // -------------------------------------------------------------------------

  it('should auto-rebase child branch onto parent branch before spawning', async () => {
    const parent = makeFeature({
      id: parentId,
      lifecycle: SdlcLifecycle.Implementation,
      branch: 'feat/parent-feature',
    });
    const blockedChild = makeFeature({
      id: 'child-001',
      lifecycle: SdlcLifecycle.Blocked,
      branch: 'feat/child-feature',
    });
    mockFeatureRepo.findById = vi.fn().mockResolvedValue(parent);
    mockFeatureRepo.findByParentId = vi.fn().mockResolvedValue([blockedChild]);

    await useCase.execute(parentId);

    expect(mockGitPrService.rebaseOnMain).toHaveBeenCalledWith(
      '/worktrees/test-feature',
      'feat/child-feature',
      'feat/parent-feature'
    );
    expect(mockAgentProcess.spawn).toHaveBeenCalledOnce();
  });

  it('should still spawn child agent if auto-rebase fails', async () => {
    const parent = makeFeature({
      id: parentId,
      lifecycle: SdlcLifecycle.Implementation,
      branch: 'feat/parent-feature',
    });
    const blockedChild = makeFeature({
      id: 'child-001',
      lifecycle: SdlcLifecycle.Blocked,
      branch: 'feat/child-feature',
    });
    mockFeatureRepo.findById = vi.fn().mockResolvedValue(parent);
    mockFeatureRepo.findByParentId = vi.fn().mockResolvedValue([blockedChild]);
    mockGitPrService.rebaseOnMain = vi.fn().mockRejectedValue(new Error('rebase conflict'));

    await useCase.execute(parentId);

    // Rebase failed but child should still be unblocked and spawned
    expect(mockFeatureRepo.update).toHaveBeenCalledOnce();
    expect(mockAgentProcess.spawn).toHaveBeenCalledOnce();
  });

  it('should skip rebase when parent has no branch', async () => {
    const parent = makeFeature({
      id: parentId,
      lifecycle: SdlcLifecycle.Implementation,
      branch: '',
    });
    const blockedChild = makeFeature({
      id: 'child-001',
      lifecycle: SdlcLifecycle.Blocked,
      branch: 'feat/child-feature',
    });
    mockFeatureRepo.findById = vi.fn().mockResolvedValue(parent);
    mockFeatureRepo.findByParentId = vi.fn().mockResolvedValue([blockedChild]);

    await useCase.execute(parentId);

    expect(mockGitPrService.rebaseOnMain).not.toHaveBeenCalled();
    expect(mockAgentProcess.spawn).toHaveBeenCalledOnce();
  });
});
