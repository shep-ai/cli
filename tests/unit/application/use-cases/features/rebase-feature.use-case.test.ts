/**
 * RebaseFeatureUseCase Unit Tests
 *
 * TDD Phase: RED-GREEN
 */

import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RebaseFeatureUseCase } from '@/application/use-cases/features/rebase-feature.use-case.js';
import type { IFeatureRepository } from '@/application/ports/output/repositories/feature-repository.interface.js';
import type { IGitPrService } from '@/application/ports/output/services/git-pr-service.interface.js';
import {
  GitPrError,
  GitPrErrorCode,
} from '@/application/ports/output/services/git-pr-service.interface.js';
import { SdlcLifecycle } from '@/domain/generated/output.js';
import type { Feature } from '@/domain/generated/output.js';

function createMockFeature(overrides?: Partial<Feature>): Feature {
  return {
    id: 'feat-123',
    name: 'Test Feature',
    slug: 'test-feature',
    description: 'A test feature',
    userQuery: 'test query',
    repositoryPath: '/repo',
    branch: 'feat/test-feature',
    worktreePath: '/repo/.worktrees/feat-test-feature',
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

describe('RebaseFeatureUseCase', () => {
  let useCase: RebaseFeatureUseCase;
  let mockFeatureRepo: IFeatureRepository;
  let mockGitPrService: IGitPrService;

  beforeEach(() => {
    mockFeatureRepo = {
      create: vi.fn(),
      findById: vi.fn(),
      findByIdPrefix: vi.fn().mockResolvedValue(null),
      findBySlug: vi.fn(),
      list: vi.fn(),
      findByParentId: vi.fn().mockResolvedValue([]),
      update: vi.fn(),
      delete: vi.fn(),
      softDelete: vi.fn(),
    };

    mockGitPrService = {
      isFork: vi.fn(),
      syncForkMain: vi.fn().mockResolvedValue(undefined),
      ensureUpstreamRemote: vi.fn().mockResolvedValue(undefined),
      fetchUpstream: vi.fn().mockResolvedValue(undefined),
      rebase: vi.fn().mockResolvedValue(undefined),
      hasRemote: vi.fn(),
      getRemoteUrl: vi.fn(),
      getDefaultBranch: vi.fn(),
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
      verifyMerge: vi.fn(),
      localMergeSquash: vi.fn(),
      getMergeableStatus: vi.fn(),
      getFailureLogs: vi.fn(),
    } as unknown as IGitPrService;

    useCase = new RebaseFeatureUseCase(mockFeatureRepo, mockGitPrService);
  });

  it('throws if feature is not found', async () => {
    (mockFeatureRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await expect(useCase.execute('missing-id')).rejects.toThrow(/not found/i);
  });

  it('throws if feature has no worktreePath', async () => {
    const feature = createMockFeature({ worktreePath: undefined });
    (mockFeatureRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(feature);

    await expect(useCase.execute('feat-123')).rejects.toThrow(/worktreePath/i);
  });

  it('rebases without syncForkMain for non-fork repos', async () => {
    const feature = createMockFeature();
    (mockFeatureRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(feature);
    (mockGitPrService.isFork as ReturnType<typeof vi.fn>).mockResolvedValue({ isFork: false });

    const result = await useCase.execute('feat-123');

    expect(mockGitPrService.syncForkMain).not.toHaveBeenCalled();
    expect(mockGitPrService.rebase).toHaveBeenCalledWith(
      '/repo/.worktrees/feat-test-feature',
      'feat/test-feature',
      'main'
    );
    expect(result).toEqual({
      success: true,
      branch: 'feat/test-feature',
      rebased: true,
    });
  });

  it('calls syncForkMain before rebase for fork repos', async () => {
    const feature = createMockFeature();
    const upstreamUrl = 'https://github.com/org/repo.git';
    (mockFeatureRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(feature);
    (mockGitPrService.isFork as ReturnType<typeof vi.fn>).mockResolvedValue({
      isFork: true,
      upstreamUrl,
    });

    const callOrder: string[] = [];
    (mockGitPrService.ensureUpstreamRemote as ReturnType<typeof vi.fn>).mockImplementation(() => {
      callOrder.push('ensureUpstreamRemote');
      return Promise.resolve();
    });
    (mockGitPrService.syncForkMain as ReturnType<typeof vi.fn>).mockImplementation(() => {
      callOrder.push('syncForkMain');
      return Promise.resolve();
    });
    (mockGitPrService.rebase as ReturnType<typeof vi.fn>).mockImplementation(() => {
      callOrder.push('rebase');
      return Promise.resolve();
    });

    const result = await useCase.execute('feat-123');

    expect(callOrder).toEqual(['ensureUpstreamRemote', 'syncForkMain', 'rebase']);
    expect(mockGitPrService.ensureUpstreamRemote).toHaveBeenCalledWith(
      '/repo/.worktrees/feat-test-feature',
      upstreamUrl
    );
    expect(mockGitPrService.syncForkMain).toHaveBeenCalledWith(
      '/repo/.worktrees/feat-test-feature'
    );
    expect(result.success).toBe(true);
  });

  it('propagates REBASE_CONFLICT error from rebase()', async () => {
    const feature = createMockFeature();
    (mockFeatureRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(feature);
    (mockGitPrService.isFork as ReturnType<typeof vi.fn>).mockResolvedValue({ isFork: false });
    const conflictError = new GitPrError(
      'Rebase conflict in src/foo.ts',
      GitPrErrorCode.REBASE_CONFLICT
    );
    (mockGitPrService.rebase as ReturnType<typeof vi.fn>).mockRejectedValue(conflictError);

    await expect(useCase.execute('feat-123')).rejects.toThrow(conflictError);
  });

  it('uses repository root (repositoryPath) for isFork detection', async () => {
    const feature = createMockFeature();
    (mockFeatureRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(feature);
    (mockGitPrService.isFork as ReturnType<typeof vi.fn>).mockResolvedValue({ isFork: false });

    await useCase.execute('feat-123');

    expect(mockGitPrService.isFork).toHaveBeenCalledWith('/repo');
  });
});
