/**
 * BatchRebaseFeaturesUseCase Unit Tests
 *
 * Tests for batch-updating feature branches with the latest remote default branch.
 *
 * TDD Phase: RED-GREEN
 */

import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BatchRebaseFeaturesUseCase } from '@/application/use-cases/features/batch-rebase-features.use-case.js';
import type { IFeatureRepository } from '@/application/ports/output/repositories/feature-repository.interface.js';
import type { IWorktreeService } from '@/application/ports/output/services/worktree-service.interface.js';
import type { IGitPrService } from '@/application/ports/output/services/git-pr-service.interface.js';
import { SdlcLifecycle } from '@/domain/generated/output.js';
import type { Feature } from '@/domain/generated/output.js';

function createMockFeature(overrides?: Partial<Feature>): Feature {
  return {
    id: 'feat-001',
    name: 'Feature One',
    slug: 'feature-one',
    description: 'A test feature',
    userQuery: 'test user query',
    repositoryPath: '/repo',
    branch: 'feat/feature-one',
    lifecycle: SdlcLifecycle.Implementation,
    messages: [],
    relatedArtifacts: [],
    push: false,
    openPr: false,
    approvalGates: { allowPrd: false, allowPlan: false, allowMerge: false },
    worktreePath: '/repo/.worktrees/feat-feature-one',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('BatchRebaseFeaturesUseCase', () => {
  let useCase: BatchRebaseFeaturesUseCase;
  let mockFeatureRepo: IFeatureRepository;
  let mockGitPrService: IGitPrService;
  let mockWorktreeService: IWorktreeService;

  beforeEach(() => {
    mockFeatureRepo = {
      create: vi.fn(),
      findById: vi.fn(),
      findByIdPrefix: vi.fn(),
      findBySlug: vi.fn(),
      list: vi.fn().mockResolvedValue([]),
      findByParentId: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    };

    mockGitPrService = {
      hasRemote: vi.fn().mockResolvedValue(true),
      getDefaultBranch: vi.fn().mockResolvedValue('main'),
      hasUncommittedChanges: vi.fn().mockResolvedValue(false),
      commitAll: vi.fn(),
      push: vi.fn(),
      createPr: vi.fn(),
      mergePr: vi.fn(),
      mergeBranch: vi.fn(),
      getCiStatus: vi.fn(),
      watchCi: vi.fn(),
      deleteBranch: vi.fn(),
      getPrDiffSummary: vi.fn(),
      listPrStatuses: vi.fn(),
      verifyMerge: vi.fn(),
      getFailureLogs: vi.fn(),
      fetchOrigin: vi.fn(),
      mergeLocalBranch: vi.fn(),
      rebaseBranch: vi.fn(),
      mergeAbort: vi.fn(),
      rebaseAbort: vi.fn(),
    };

    mockWorktreeService = {
      create: vi.fn(),
      remove: vi.fn(),
      list: vi.fn(),
      exists: vi.fn().mockResolvedValue(false),
      branchExists: vi.fn().mockResolvedValue(true),
      remoteBranchExists: vi.fn(),
      getWorktreePath: vi.fn(),
      ensureGitRepository: vi.fn(),
    };

    useCase = new BatchRebaseFeaturesUseCase(
      mockFeatureRepo,
      mockGitPrService,
      mockWorktreeService
    );
  });

  // -------------------------------------------------------------------------
  // Task 5: Basic merge success path
  // -------------------------------------------------------------------------

  it('should fetch origin and get default branch before processing', async () => {
    const features = [createMockFeature()];
    mockFeatureRepo.list = vi.fn().mockResolvedValue(features);

    await useCase.execute({ repositoryPath: '/repo', strategy: 'merge' });

    expect(mockGitPrService.fetchOrigin).toHaveBeenCalledWith('/repo');
    expect(mockGitPrService.getDefaultBranch).toHaveBeenCalledWith('/repo');
    expect(mockGitPrService.fetchOrigin).toHaveBeenCalledBefore(
      mockGitPrService.mergeLocalBranch as ReturnType<typeof vi.fn>
    );
  });

  it('should merge each feature with origin/defaultBranch', async () => {
    const features = [
      createMockFeature({ id: 'feat-001', worktreePath: '/wt/one', branch: 'feat/one' }),
      createMockFeature({ id: 'feat-002', worktreePath: '/wt/two', branch: 'feat/two' }),
    ];
    mockFeatureRepo.list = vi.fn().mockResolvedValue(features);

    await useCase.execute({ repositoryPath: '/repo', strategy: 'merge' });

    expect(mockGitPrService.mergeLocalBranch).toHaveBeenCalledWith('/wt/one', 'origin/main');
    expect(mockGitPrService.mergeLocalBranch).toHaveBeenCalledWith('/wt/two', 'origin/main');
  });

  it('should return success result for each successfully merged feature', async () => {
    const features = [
      createMockFeature({
        id: 'feat-001',
        name: 'One',
        branch: 'feat/one',
        worktreePath: '/wt/one',
      }),
      createMockFeature({
        id: 'feat-002',
        name: 'Two',
        branch: 'feat/two',
        worktreePath: '/wt/two',
      }),
    ];
    mockFeatureRepo.list = vi.fn().mockResolvedValue(features);

    const results = await useCase.execute({ repositoryPath: '/repo', strategy: 'merge' });

    expect(results).toHaveLength(2);
    expect(results[0]).toEqual(
      expect.objectContaining({
        featureId: 'feat-001',
        featureName: 'One',
        branch: 'feat/one',
        status: 'success',
      })
    );
    expect(results[1]).toEqual(
      expect.objectContaining({
        featureId: 'feat-002',
        featureName: 'Two',
        branch: 'feat/two',
        status: 'success',
      })
    );
  });

  it('should call onProgress for each feature with correct index and total', async () => {
    const features = [
      createMockFeature({ id: 'feat-001', name: 'Alpha', worktreePath: '/wt/alpha' }),
      createMockFeature({ id: 'feat-002', name: 'Beta', worktreePath: '/wt/beta' }),
      createMockFeature({ id: 'feat-003', name: 'Gamma', worktreePath: '/wt/gamma' }),
    ];
    mockFeatureRepo.list = vi.fn().mockResolvedValue(features);
    const onProgress = vi.fn();

    await useCase.execute({ repositoryPath: '/repo', strategy: 'merge', onProgress });

    expect(onProgress).toHaveBeenCalledTimes(3);
    expect(onProgress).toHaveBeenNthCalledWith(1, { index: 0, total: 3, name: 'Alpha' });
    expect(onProgress).toHaveBeenNthCalledWith(2, { index: 1, total: 3, name: 'Beta' });
    expect(onProgress).toHaveBeenNthCalledWith(3, { index: 2, total: 3, name: 'Gamma' });
  });

  it('should pass repositoryPath filter to featureRepo.list', async () => {
    mockFeatureRepo.list = vi.fn().mockResolvedValue([]);

    await useCase.execute({ repositoryPath: '/my/repo', strategy: 'merge' });

    expect(mockFeatureRepo.list).toHaveBeenCalledWith(
      expect.objectContaining({ repositoryPath: '/my/repo' })
    );
  });

  it('should return empty array when no features exist', async () => {
    mockFeatureRepo.list = vi.fn().mockResolvedValue([]);

    const results = await useCase.execute({ repositoryPath: '/repo', strategy: 'merge' });

    expect(results).toEqual([]);
    expect(mockGitPrService.mergeLocalBranch).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // Task 6: Rebase strategy support
  // -------------------------------------------------------------------------

  it('should call rebaseBranch instead of mergeLocalBranch when strategy is rebase', async () => {
    const features = [createMockFeature({ worktreePath: '/wt/one' })];
    mockFeatureRepo.list = vi.fn().mockResolvedValue(features);

    await useCase.execute({ repositoryPath: '/repo', strategy: 'rebase' });

    expect(mockGitPrService.rebaseBranch).toHaveBeenCalledWith('/wt/one', 'origin/main');
    expect(mockGitPrService.mergeLocalBranch).not.toHaveBeenCalled();
  });

  it('should call rebaseAbort on conflict when strategy is rebase', async () => {
    const { GitPrError, GitPrErrorCode } = await import(
      '@/application/ports/output/services/git-pr-service.interface.js'
    );
    const features = [createMockFeature({ worktreePath: '/wt/one' })];
    mockFeatureRepo.list = vi.fn().mockResolvedValue(features);
    mockGitPrService.rebaseBranch = vi
      .fn()
      .mockRejectedValue(new GitPrError('conflict', GitPrErrorCode.MERGE_CONFLICT));

    const results = await useCase.execute({ repositoryPath: '/repo', strategy: 'rebase' });

    expect(mockGitPrService.rebaseAbort).toHaveBeenCalledWith('/wt/one');
    expect(results[0].status).toBe('failed');
    expect(results[0].reason).toContain('rebase conflicts');
  });

  it('should report "rebase conflicts" in result reason for rebase strategy', async () => {
    const { GitPrError, GitPrErrorCode } = await import(
      '@/application/ports/output/services/git-pr-service.interface.js'
    );
    const features = [createMockFeature({ worktreePath: '/wt/one' })];
    mockFeatureRepo.list = vi.fn().mockResolvedValue(features);
    mockGitPrService.rebaseBranch = vi
      .fn()
      .mockRejectedValue(new GitPrError('conflict', GitPrErrorCode.MERGE_CONFLICT));

    const results = await useCase.execute({ repositoryPath: '/repo', strategy: 'rebase' });

    expect(results[0].reason).toBe('rebase conflicts');
  });

  it('should call mergeAbort on conflict when strategy is merge', async () => {
    const { GitPrError, GitPrErrorCode } = await import(
      '@/application/ports/output/services/git-pr-service.interface.js'
    );
    const features = [createMockFeature({ worktreePath: '/wt/one' })];
    mockFeatureRepo.list = vi.fn().mockResolvedValue(features);
    mockGitPrService.mergeLocalBranch = vi
      .fn()
      .mockRejectedValue(new GitPrError('conflict', GitPrErrorCode.MERGE_CONFLICT));

    const results = await useCase.execute({ repositoryPath: '/repo', strategy: 'merge' });

    expect(mockGitPrService.mergeAbort).toHaveBeenCalledWith('/wt/one');
    expect(results[0].reason).toBe('merge conflicts');
  });

  // -------------------------------------------------------------------------
  // Task 7: Skip paths
  // -------------------------------------------------------------------------

  it('should skip feature with dirty worktree with reason "uncommitted changes"', async () => {
    const features = [createMockFeature({ worktreePath: '/wt/dirty' })];
    mockFeatureRepo.list = vi.fn().mockResolvedValue(features);
    mockGitPrService.hasUncommittedChanges = vi.fn().mockResolvedValue(true);

    const results = await useCase.execute({ repositoryPath: '/repo', strategy: 'merge' });

    expect(results[0].status).toBe('skipped');
    expect(results[0].reason).toBe('uncommitted changes');
    expect(mockGitPrService.mergeLocalBranch).not.toHaveBeenCalled();
  });

  it('should skip feature with non-existent branch with reason "branch not found"', async () => {
    const features = [createMockFeature({ worktreePath: '/wt/one' })];
    mockFeatureRepo.list = vi.fn().mockResolvedValue(features);
    mockWorktreeService.branchExists = vi.fn().mockResolvedValue(false);

    const results = await useCase.execute({ repositoryPath: '/repo', strategy: 'merge' });

    expect(results[0].status).toBe('skipped');
    expect(results[0].reason).toBe('branch not found');
    expect(mockGitPrService.mergeLocalBranch).not.toHaveBeenCalled();
  });

  it('should throw error when repo has no remote', async () => {
    mockGitPrService.hasRemote = vi.fn().mockResolvedValue(false);

    await expect(useCase.execute({ repositoryPath: '/repo', strategy: 'merge' })).rejects.toThrow(
      /no remote/i
    );

    expect(mockGitPrService.fetchOrigin).not.toHaveBeenCalled();
    expect(mockFeatureRepo.list).not.toHaveBeenCalled();
  });

  it('should not call merge/rebase for skipped features', async () => {
    const features = [
      createMockFeature({ id: 'f1', worktreePath: '/wt/dirty' }),
      createMockFeature({ id: 'f2', worktreePath: '/wt/clean' }),
    ];
    mockFeatureRepo.list = vi.fn().mockResolvedValue(features);
    mockGitPrService.hasUncommittedChanges = vi
      .fn()
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false);

    const results = await useCase.execute({ repositoryPath: '/repo', strategy: 'merge' });

    expect(results[0].status).toBe('skipped');
    expect(results[1].status).toBe('success');
    expect(mockGitPrService.mergeLocalBranch).toHaveBeenCalledTimes(1);
    expect(mockGitPrService.mergeLocalBranch).toHaveBeenCalledWith('/wt/clean', 'origin/main');
  });

  it('should still call onProgress for skipped features', async () => {
    const features = [createMockFeature({ name: 'Dirty', worktreePath: '/wt/dirty' })];
    mockFeatureRepo.list = vi.fn().mockResolvedValue(features);
    mockGitPrService.hasUncommittedChanges = vi.fn().mockResolvedValue(true);
    const onProgress = vi.fn();

    await useCase.execute({ repositoryPath: '/repo', strategy: 'merge', onProgress });

    expect(onProgress).toHaveBeenCalledWith({ index: 0, total: 1, name: 'Dirty' });
  });

  // -------------------------------------------------------------------------
  // Task 8: Conflict abort-and-continue and unexpected error handling
  // -------------------------------------------------------------------------

  it('should abort merge on conflict and record failed result', async () => {
    const { GitPrError, GitPrErrorCode } = await import(
      '@/application/ports/output/services/git-pr-service.interface.js'
    );
    const features = [createMockFeature({ worktreePath: '/wt/conflict' })];
    mockFeatureRepo.list = vi.fn().mockResolvedValue(features);
    mockGitPrService.mergeLocalBranch = vi
      .fn()
      .mockRejectedValue(new GitPrError('conflict', GitPrErrorCode.MERGE_CONFLICT));

    const results = await useCase.execute({ repositoryPath: '/repo', strategy: 'merge' });

    expect(mockGitPrService.mergeAbort).toHaveBeenCalledWith('/wt/conflict');
    expect(results[0].status).toBe('failed');
    expect(results[0].reason).toBe('merge conflicts');
  });

  it('should continue processing after a conflict', async () => {
    const { GitPrError, GitPrErrorCode } = await import(
      '@/application/ports/output/services/git-pr-service.interface.js'
    );
    const features = [
      createMockFeature({
        id: 'f1',
        name: 'Conflict',
        worktreePath: '/wt/conflict',
        branch: 'feat/conflict',
      }),
      createMockFeature({
        id: 'f2',
        name: 'Clean',
        worktreePath: '/wt/clean',
        branch: 'feat/clean',
      }),
    ];
    mockFeatureRepo.list = vi.fn().mockResolvedValue(features);
    mockGitPrService.mergeLocalBranch = vi
      .fn()
      .mockRejectedValueOnce(new GitPrError('conflict', GitPrErrorCode.MERGE_CONFLICT))
      .mockResolvedValueOnce(undefined);

    const results = await useCase.execute({ repositoryPath: '/repo', strategy: 'merge' });

    expect(results).toHaveLength(2);
    expect(results[0].status).toBe('failed');
    expect(results[1].status).toBe('success');
  });

  it('should catch unexpected errors and record failed result with error message', async () => {
    const features = [createMockFeature({ worktreePath: '/wt/broken' })];
    mockFeatureRepo.list = vi.fn().mockResolvedValue(features);
    mockGitPrService.mergeLocalBranch = vi
      .fn()
      .mockRejectedValue(new Error('unexpected git failure'));

    const results = await useCase.execute({ repositoryPath: '/repo', strategy: 'merge' });

    expect(results[0].status).toBe('failed');
    expect(results[0].reason).toBe('unexpected git failure');
  });

  it('should continue batch after unexpected error', async () => {
    const features = [
      createMockFeature({ id: 'f1', worktreePath: '/wt/broken', branch: 'feat/broken' }),
      createMockFeature({ id: 'f2', worktreePath: '/wt/ok', branch: 'feat/ok' }),
    ];
    mockFeatureRepo.list = vi.fn().mockResolvedValue(features);
    mockGitPrService.mergeLocalBranch = vi
      .fn()
      .mockRejectedValueOnce(new Error('some error'))
      .mockResolvedValueOnce(undefined);

    const results = await useCase.execute({ repositoryPath: '/repo', strategy: 'merge' });

    expect(results).toHaveLength(2);
    expect(results[0].status).toBe('failed');
    expect(results[1].status).toBe('success');
  });

  // -------------------------------------------------------------------------
  // Task 9: Temporary worktree creation for features without worktrees
  // -------------------------------------------------------------------------

  it('should create temporary worktree for feature without worktreePath', async () => {
    const features = [
      createMockFeature({ id: 'feat-no-wt', worktreePath: undefined, branch: 'feat/no-wt' }),
    ];
    mockFeatureRepo.list = vi.fn().mockResolvedValue(features);
    mockWorktreeService.create = vi.fn().mockResolvedValue({
      path: expect.any(String),
      head: 'abc123',
      branch: 'feat/no-wt',
      isMain: false,
    });

    await useCase.execute({ repositoryPath: '/repo', strategy: 'merge' });

    expect(mockWorktreeService.create).toHaveBeenCalledWith(
      '/repo',
      'feat/no-wt',
      expect.stringContaining('shep-rebase-feat-no-wt')
    );
  });

  it('should perform merge in the temporary worktree directory', async () => {
    const features = [
      createMockFeature({ id: 'feat-no-wt', worktreePath: undefined, branch: 'feat/no-wt' }),
    ];
    mockFeatureRepo.list = vi.fn().mockResolvedValue(features);
    mockWorktreeService.create = vi.fn().mockImplementation((_repo, _branch, wtPath) =>
      Promise.resolve({
        path: wtPath,
        head: 'abc123',
        branch: 'feat/no-wt',
        isMain: false,
      })
    );

    await useCase.execute({ repositoryPath: '/repo', strategy: 'merge' });

    expect(mockGitPrService.mergeLocalBranch).toHaveBeenCalledWith(
      expect.stringContaining('shep-rebase-feat-no-wt'),
      'origin/main'
    );
  });

  it('should remove temporary worktree after successful merge', async () => {
    const features = [
      createMockFeature({ id: 'feat-no-wt', worktreePath: undefined, branch: 'feat/no-wt' }),
    ];
    mockFeatureRepo.list = vi.fn().mockResolvedValue(features);
    mockWorktreeService.create = vi.fn().mockImplementation((_repo, _branch, wtPath) =>
      Promise.resolve({
        path: wtPath,
        head: 'abc123',
        branch: 'feat/no-wt',
        isMain: false,
      })
    );

    await useCase.execute({ repositoryPath: '/repo', strategy: 'merge' });

    expect(mockWorktreeService.remove).toHaveBeenCalledWith(
      expect.stringContaining('shep-rebase-feat-no-wt')
    );
  });

  it('should remove temporary worktree even after merge failure', async () => {
    const { GitPrError, GitPrErrorCode } = await import(
      '@/application/ports/output/services/git-pr-service.interface.js'
    );
    const features = [
      createMockFeature({ id: 'feat-no-wt', worktreePath: undefined, branch: 'feat/no-wt' }),
    ];
    mockFeatureRepo.list = vi.fn().mockResolvedValue(features);
    mockWorktreeService.create = vi.fn().mockImplementation((_repo, _branch, wtPath) =>
      Promise.resolve({
        path: wtPath,
        head: 'abc123',
        branch: 'feat/no-wt',
        isMain: false,
      })
    );
    mockGitPrService.mergeLocalBranch = vi
      .fn()
      .mockRejectedValue(new GitPrError('conflict', GitPrErrorCode.MERGE_CONFLICT));

    await useCase.execute({ repositoryPath: '/repo', strategy: 'merge' });

    expect(mockWorktreeService.remove).toHaveBeenCalledWith(
      expect.stringContaining('shep-rebase-feat-no-wt')
    );
  });

  it('should swallow worktree cleanup errors gracefully', async () => {
    const features = [
      createMockFeature({ id: 'feat-no-wt', worktreePath: undefined, branch: 'feat/no-wt' }),
    ];
    mockFeatureRepo.list = vi.fn().mockResolvedValue(features);
    mockWorktreeService.create = vi.fn().mockImplementation((_repo, _branch, wtPath) =>
      Promise.resolve({
        path: wtPath,
        head: 'abc123',
        branch: 'feat/no-wt',
        isMain: false,
      })
    );
    mockWorktreeService.remove = vi.fn().mockRejectedValue(new Error('cleanup failed'));

    const results = await useCase.execute({ repositoryPath: '/repo', strategy: 'merge' });

    expect(results[0].status).toBe('success');
  });

  it('should use existing worktree if worktreeService.exists returns true for branch without worktreePath', async () => {
    const features = [
      createMockFeature({ id: 'feat-no-wt', worktreePath: undefined, branch: 'feat/no-wt' }),
    ];
    mockFeatureRepo.list = vi.fn().mockResolvedValue(features);
    mockWorktreeService.exists = vi.fn().mockResolvedValue(true);
    mockWorktreeService.getWorktreePath = vi.fn().mockReturnValue('/repo/.worktrees/feat-no-wt');

    await useCase.execute({ repositoryPath: '/repo', strategy: 'merge' });

    expect(mockWorktreeService.create).not.toHaveBeenCalled();
    expect(mockGitPrService.mergeLocalBranch).toHaveBeenCalledWith(
      '/repo/.worktrees/feat-no-wt',
      'origin/main'
    );
  });

  // -------------------------------------------------------------------------
  // Task 10: Lifecycle and feature ID filtering
  // -------------------------------------------------------------------------

  it('should pass lifecycle filter to featureRepo.list', async () => {
    mockFeatureRepo.list = vi.fn().mockResolvedValue([]);

    await useCase.execute({
      repositoryPath: '/repo',
      strategy: 'merge',
      lifecycle: SdlcLifecycle.Implementation,
    });

    expect(mockFeatureRepo.list).toHaveBeenCalledWith(
      expect.objectContaining({ lifecycle: SdlcLifecycle.Implementation })
    );
  });

  it('should resolve featureIds via findByIdPrefix and only process those', async () => {
    const feature1 = createMockFeature({ id: 'feat-001', name: 'One', worktreePath: '/wt/one' });
    const feature2 = createMockFeature({ id: 'feat-002', name: 'Two', worktreePath: '/wt/two' });
    mockFeatureRepo.findByIdPrefix = vi
      .fn()
      .mockResolvedValueOnce(feature1)
      .mockResolvedValueOnce(feature2);

    const results = await useCase.execute({
      repositoryPath: '/repo',
      strategy: 'merge',
      featureIds: ['feat-001', 'feat-002'],
    });

    expect(mockFeatureRepo.list).not.toHaveBeenCalled();
    expect(mockFeatureRepo.findByIdPrefix).toHaveBeenCalledWith('feat-001');
    expect(mockFeatureRepo.findByIdPrefix).toHaveBeenCalledWith('feat-002');
    expect(results).toHaveLength(2);
  });

  it('should produce skipped result for unmatched featureId', async () => {
    mockFeatureRepo.findByIdPrefix = vi.fn().mockResolvedValue(null);

    const results = await useCase.execute({
      repositoryPath: '/repo',
      strategy: 'merge',
      featureIds: ['no-match'],
    });

    expect(results).toHaveLength(1);
    expect(results[0].status).toBe('skipped');
    expect(results[0].reason).toBe('feature not found');
    expect(results[0].featureId).toBe('no-match');
  });

  it('should use featureIds instead of list when both featureIds and lifecycle provided', async () => {
    const feature = createMockFeature({ worktreePath: '/wt/one' });
    mockFeatureRepo.findByIdPrefix = vi.fn().mockResolvedValue(feature);

    await useCase.execute({
      repositoryPath: '/repo',
      strategy: 'merge',
      featureIds: ['feat-001'],
      lifecycle: SdlcLifecycle.Implementation,
    });

    expect(mockFeatureRepo.findByIdPrefix).toHaveBeenCalledWith('feat-001');
    expect(mockFeatureRepo.list).not.toHaveBeenCalled();
  });
});
