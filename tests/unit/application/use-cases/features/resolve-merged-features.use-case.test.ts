/**
 * ResolveMergedFeaturesUseCase Unit Tests
 *
 * Verifies auto-resolution of stale Review features whose branch was merged:
 * - No-op when no Review features exist
 * - Skips features without repositoryPath or branch
 * - Skips features in repos without a remote
 * - Transitions merged features to Maintain and completes agent run
 * - Leaves non-merged features untouched
 * - Handles git operation failures gracefully
 */

import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ResolveMergedFeaturesUseCase } from '@/application/use-cases/features/resolve-merged-features.use-case.js';
import type { IFeatureRepository } from '@/application/ports/output/repositories/feature-repository.interface.js';
import type { IGitPrService } from '@/application/ports/output/services/git-pr-service.interface.js';
import type { IAgentRunRepository } from '@/application/ports/output/agents/agent-run-repository.interface.js';
import { SdlcLifecycle, AgentRunStatus } from '@/domain/generated/output.js';
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
    lifecycle: SdlcLifecycle.Review,
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

describe('ResolveMergedFeaturesUseCase', () => {
  let useCase: ResolveMergedFeaturesUseCase;
  let mockFeatureRepo: IFeatureRepository;
  let mockGitPrService: IGitPrService;
  let mockAgentRunRepo: IAgentRunRepository;

  beforeEach(() => {
    mockFeatureRepo = {
      create: vi.fn(),
      findById: vi.fn(),
      findByIdPrefix: vi.fn(),
      findBySlug: vi.fn(),
      findByBranch: vi.fn(),
      list: vi.fn().mockResolvedValue([]),
      findByParentId: vi.fn(),
      update: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn(),
      softDelete: vi.fn(),
    };

    mockGitPrService = {
      hasRemote: vi.fn().mockResolvedValue(true),
      getRemoteUrl: vi.fn(),
      getDefaultBranch: vi.fn().mockResolvedValue('main'),
      revParse: vi.fn(),
      hasUncommittedChanges: vi.fn(),
      commitAll: vi.fn(),
      push: vi.fn(),
      createPr: vi.fn(),
      mergePr: vi.fn(),
      mergeBranch: vi.fn(),
      getCiStatus: vi.fn(),
      watchCi: vi.fn(),
      deleteBranch: vi.fn(),
      getPrDiffSummary: vi.fn(),
      getFileDiffs: vi.fn(),
      listPrStatuses: vi.fn(),
      verifyMerge: vi.fn().mockResolvedValue(false),
      localMergeSquash: vi.fn(),
      getMergeableStatus: vi.fn(),
      getFailureLogs: vi.fn(),
      syncMain: vi.fn().mockResolvedValue(undefined),
      rebaseOnMain: vi.fn(),
      getConflictedFiles: vi.fn(),
      stageFiles: vi.fn(),
      rebaseContinue: vi.fn(),
      rebaseAbort: vi.fn(),
      getBranchSyncStatus: vi.fn(),
    } as unknown as IGitPrService;

    mockAgentRunRepo = {
      create: vi.fn(),
      findById: vi.fn(),
      findByFeatureId: vi.fn(),
      list: vi.fn(),
      updateStatus: vi.fn().mockResolvedValue(undefined),
      update: vi.fn(),
      delete: vi.fn(),
    } as unknown as IAgentRunRepository;

    useCase = new ResolveMergedFeaturesUseCase(mockFeatureRepo, mockGitPrService, mockAgentRunRepo);
  });

  // -------------------------------------------------------------------------
  // No-op scenarios
  // -------------------------------------------------------------------------

  it('should return 0 when no Review features exist', async () => {
    mockFeatureRepo.list = vi.fn().mockResolvedValue([]);

    const result = await useCase.execute();

    expect(result).toBe(0);
    expect(mockGitPrService.verifyMerge).not.toHaveBeenCalled();
  });

  it('should skip features without repositoryPath', async () => {
    const feature = makeFeature({ repositoryPath: '' });
    mockFeatureRepo.list = vi.fn().mockResolvedValue([feature]);

    const result = await useCase.execute();

    expect(result).toBe(0);
    expect(mockGitPrService.hasRemote).not.toHaveBeenCalled();
  });

  it('should skip features without branch', async () => {
    const feature = makeFeature({ branch: '' });
    mockFeatureRepo.list = vi.fn().mockResolvedValue([feature]);

    const result = await useCase.execute();

    expect(result).toBe(0);
    expect(mockGitPrService.hasRemote).not.toHaveBeenCalled();
  });

  it('should skip features in repos without a remote', async () => {
    const feature = makeFeature();
    mockFeatureRepo.list = vi.fn().mockResolvedValue([feature]);
    mockGitPrService.hasRemote = vi.fn().mockResolvedValue(false);

    const result = await useCase.execute();

    expect(result).toBe(0);
    expect(mockGitPrService.verifyMerge).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // Merged feature transitions
  // -------------------------------------------------------------------------

  it('should transition a merged feature to Maintain', async () => {
    const feature = makeFeature();
    mockFeatureRepo.list = vi.fn().mockResolvedValue([feature]);
    mockGitPrService.verifyMerge = vi.fn().mockResolvedValue(true);

    const result = await useCase.execute();

    expect(result).toBe(1);
    expect(mockFeatureRepo.update).toHaveBeenCalledOnce();
    const updatedFeature = (mockFeatureRepo.update as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(updatedFeature.lifecycle).toBe(SdlcLifecycle.Maintain);
  });

  it('should complete the agent run when transitioning a merged feature', async () => {
    const feature = makeFeature({ agentRunId: 'run-123' });
    mockFeatureRepo.list = vi.fn().mockResolvedValue([feature]);
    mockGitPrService.verifyMerge = vi.fn().mockResolvedValue(true);

    await useCase.execute();

    expect(mockAgentRunRepo.updateStatus).toHaveBeenCalledWith('run-123', AgentRunStatus.completed);
  });

  it('should not complete agent run when feature has no agentRunId', async () => {
    const feature = makeFeature({ agentRunId: undefined });
    mockFeatureRepo.list = vi.fn().mockResolvedValue([feature]);
    mockGitPrService.verifyMerge = vi.fn().mockResolvedValue(true);

    await useCase.execute();

    expect(mockAgentRunRepo.updateStatus).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // Non-merged features left untouched
  // -------------------------------------------------------------------------

  it('should not transition a non-merged feature', async () => {
    const feature = makeFeature();
    mockFeatureRepo.list = vi.fn().mockResolvedValue([feature]);
    mockGitPrService.verifyMerge = vi.fn().mockResolvedValue(false);

    const result = await useCase.execute();

    expect(result).toBe(0);
    expect(mockFeatureRepo.update).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // Multiple features
  // -------------------------------------------------------------------------

  it('should resolve multiple merged features and skip non-merged ones', async () => {
    const merged1 = makeFeature({ id: 'feat-merged-1', branch: 'feat/merged-1' });
    const notMerged = makeFeature({ id: 'feat-open', branch: 'feat/open' });
    const merged2 = makeFeature({ id: 'feat-merged-2', branch: 'feat/merged-2' });

    mockFeatureRepo.list = vi.fn().mockResolvedValue([merged1, notMerged, merged2]);
    mockGitPrService.verifyMerge = vi
      .fn()
      .mockResolvedValueOnce(true) // merged1
      .mockResolvedValueOnce(false) // notMerged
      .mockResolvedValueOnce(true); // merged2

    const result = await useCase.execute();

    expect(result).toBe(2);
    expect(mockFeatureRepo.update).toHaveBeenCalledTimes(2);
  });

  // -------------------------------------------------------------------------
  // Error handling
  // -------------------------------------------------------------------------

  it('should skip features where verifyMerge throws and continue processing', async () => {
    const errorFeature = makeFeature({ id: 'feat-error', branch: 'feat/error' });
    const mergedFeature = makeFeature({ id: 'feat-ok', branch: 'feat/ok' });

    mockFeatureRepo.list = vi.fn().mockResolvedValue([errorFeature, mergedFeature]);
    mockGitPrService.verifyMerge = vi
      .fn()
      .mockRejectedValueOnce(new Error('git error'))
      .mockResolvedValueOnce(true);

    const result = await useCase.execute();

    expect(result).toBe(1);
    expect(mockFeatureRepo.update).toHaveBeenCalledOnce();
    const updatedId = (mockFeatureRepo.update as ReturnType<typeof vi.fn>).mock.calls[0][0].id;
    expect(updatedId).toBe('feat-ok');
  });

  it('should still resolve feature even if agent run update fails', async () => {
    const feature = makeFeature({ agentRunId: 'run-fail' });
    mockFeatureRepo.list = vi.fn().mockResolvedValue([feature]);
    mockGitPrService.verifyMerge = vi.fn().mockResolvedValue(true);
    mockAgentRunRepo.updateStatus = vi.fn().mockRejectedValue(new Error('db error'));

    const result = await useCase.execute();

    expect(result).toBe(1);
    expect(mockFeatureRepo.update).toHaveBeenCalledOnce();
  });

  it('should call verifyMerge with the correct default branch', async () => {
    const feature = makeFeature({ repositoryPath: '/my-repo', branch: 'feat/my-branch' });
    mockFeatureRepo.list = vi.fn().mockResolvedValue([feature]);
    mockGitPrService.getDefaultBranch = vi.fn().mockResolvedValue('develop');

    await useCase.execute();

    expect(mockGitPrService.verifyMerge).toHaveBeenCalledWith(
      '/my-repo',
      'feat/my-branch',
      'develop'
    );
  });

  it('should sync remote refs before checking merge status', async () => {
    const feature = makeFeature();
    mockFeatureRepo.list = vi.fn().mockResolvedValue([feature]);

    await useCase.execute();

    expect(mockGitPrService.syncMain).toHaveBeenCalledWith('/repo', 'main');
    // syncMain should be called before verifyMerge
    const syncOrder = (mockGitPrService.syncMain as ReturnType<typeof vi.fn>).mock
      .invocationCallOrder[0];
    const verifyOrder = (mockGitPrService.verifyMerge as ReturnType<typeof vi.fn>).mock
      .invocationCallOrder[0];
    expect(syncOrder).toBeLessThan(verifyOrder);
  });

  it('should proceed with merge check even if syncMain fails', async () => {
    const feature = makeFeature();
    mockFeatureRepo.list = vi.fn().mockResolvedValue([feature]);
    mockGitPrService.syncMain = vi.fn().mockRejectedValue(new Error('sync failed'));
    mockGitPrService.verifyMerge = vi.fn().mockResolvedValue(true);

    const result = await useCase.execute();

    expect(result).toBe(1);
    expect(mockGitPrService.verifyMerge).toHaveBeenCalled();
  });
});
