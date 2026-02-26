/**
 * CleanupFeatureWorktreeUseCase Unit Tests
 *
 * Tests for post-merge cleanup: worktree unlinking, local branch deletion,
 * and remote branch deletion. All cleanup steps are non-fatal.
 *
 * TDD Phase: RED-GREEN
 */

import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CleanupFeatureWorktreeUseCase } from '@/application/use-cases/features/cleanup-feature-worktree.use-case.js';
import type { IFeatureRepository } from '@/application/ports/output/repositories/feature-repository.interface.js';
import type { IWorktreeService } from '@/application/ports/output/services/worktree-service.interface.js';
import type { IGitPrService } from '@/application/ports/output/services/git-pr-service.interface.js';
import { SdlcLifecycle } from '@/domain/generated/output.js';
import type { Feature } from '@/domain/generated/output.js';

function createMockFeature(overrides?: Partial<Feature>): Feature {
  return {
    id: 'feat-123-full-uuid',
    name: 'Test Feature',
    slug: 'test-feature',
    description: 'A test feature',
    userQuery: 'test user query',
    repositoryPath: '/repo',
    branch: 'feat/test-feature',
    worktreePath: '/repo/.worktrees/feat-test-feature',
    lifecycle: SdlcLifecycle.Maintain,
    messages: [],
    relatedArtifacts: [],
    push: false,
    openPr: false,
    approvalGates: { allowPrd: false, allowPlan: false, allowMerge: false },
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('CleanupFeatureWorktreeUseCase', () => {
  let useCase: CleanupFeatureWorktreeUseCase;
  let mockFeatureRepo: IFeatureRepository;
  let mockWorktreeService: IWorktreeService;
  let mockGitPrService: IGitPrService;

  beforeEach(() => {
    vi.clearAllMocks();

    mockFeatureRepo = {
      create: vi.fn(),
      findById: vi.fn().mockResolvedValue(createMockFeature()),
      findByIdPrefix: vi.fn().mockResolvedValue(null),
      findBySlug: vi.fn(),
      list: vi.fn(),
      findByParentId: vi.fn().mockResolvedValue([]),
      update: vi.fn(),
      delete: vi.fn(),
    };

    mockWorktreeService = {
      create: vi.fn(),
      remove: vi.fn().mockResolvedValue(undefined),
      list: vi.fn(),
      exists: vi.fn(),
      branchExists: vi.fn(),
      remoteBranchExists: vi.fn().mockResolvedValue(true),
      getWorktreePath: vi.fn(),
      ensureGitRepository: vi.fn(),
    };

    mockGitPrService = {
      hasRemote: vi.fn(),
      getDefaultBranch: vi.fn(),
      hasUncommittedChanges: vi.fn(),
      commitAll: vi.fn(),
      push: vi.fn(),
      createPr: vi.fn(),
      mergePr: vi.fn(),
      mergeBranch: vi.fn(),
      getCiStatus: vi.fn(),
      watchCi: vi.fn(),
      deleteBranch: vi.fn().mockResolvedValue(undefined),
      getPrDiffSummary: vi.fn(),
      listPrStatuses: vi.fn(),
      verifyMerge: vi.fn(),
      getFailureLogs: vi.fn(),
    };

    useCase = new CleanupFeatureWorktreeUseCase(
      mockFeatureRepo,
      mockWorktreeService,
      mockGitPrService
    );
  });

  // ---------------------------------------------------------------------------
  // Happy path
  // ---------------------------------------------------------------------------

  it('should remove worktree, delete local branch, and delete remote branch on happy path', async () => {
    const feature = createMockFeature();
    mockFeatureRepo.findById = vi.fn().mockResolvedValue(feature);
    mockWorktreeService.remoteBranchExists = vi.fn().mockResolvedValue(true);

    await useCase.execute('feat-123-full-uuid');

    expect(mockWorktreeService.remove).toHaveBeenCalledWith(
      '/repo/.worktrees/feat-test-feature',
      true
    );
    expect(mockGitPrService.deleteBranch).toHaveBeenCalledWith('/repo', 'feat/test-feature');
    expect(mockWorktreeService.remoteBranchExists).toHaveBeenCalledWith(
      '/repo',
      'feat/test-feature'
    );
    expect(mockGitPrService.deleteBranch).toHaveBeenCalledWith('/repo', 'feat/test-feature', true);
  });

  // ---------------------------------------------------------------------------
  // Not-found guard
  // ---------------------------------------------------------------------------

  it('should return early without calling any service when feature is not found', async () => {
    mockFeatureRepo.findById = vi.fn().mockResolvedValue(null);

    await useCase.execute('non-existent-id');

    expect(mockWorktreeService.remove).not.toHaveBeenCalled();
    expect(mockGitPrService.deleteBranch).not.toHaveBeenCalled();
    expect(mockWorktreeService.remoteBranchExists).not.toHaveBeenCalled();
  });

  // ---------------------------------------------------------------------------
  // Edge cases — non-fatal error handling
  // ---------------------------------------------------------------------------

  it('should log warn and continue when worktree remove throws', async () => {
    const feature = createMockFeature();
    mockFeatureRepo.findById = vi.fn().mockResolvedValue(feature);
    mockWorktreeService.remove = vi.fn().mockRejectedValue(new Error('worktree not found'));
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    await useCase.execute('feat-123-full-uuid');

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('CleanupFeatureWorktreeUseCase'),
      expect.anything()
    );
    // Local branch deletion should still be called
    expect(mockGitPrService.deleteBranch).toHaveBeenCalledWith('/repo', 'feat/test-feature');
    warnSpy.mockRestore();
  });

  it('should skip worktree step when feature has no worktreePath', async () => {
    const feature = createMockFeature({ worktreePath: undefined });
    mockFeatureRepo.findById = vi.fn().mockResolvedValue(feature);

    await useCase.execute('feat-123-full-uuid');

    expect(mockWorktreeService.remove).not.toHaveBeenCalled();
    // Remaining steps still run
    expect(mockGitPrService.deleteBranch).toHaveBeenCalledWith('/repo', 'feat/test-feature');
  });

  it('should log warn and continue when local branch deleteBranch throws', async () => {
    const feature = createMockFeature();
    mockFeatureRepo.findById = vi.fn().mockResolvedValue(feature);
    mockGitPrService.deleteBranch = vi
      .fn()
      .mockRejectedValueOnce(new Error('branch not found'))
      .mockResolvedValueOnce(undefined);
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    await useCase.execute('feat-123-full-uuid');

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('CleanupFeatureWorktreeUseCase'),
      expect.anything()
    );
    // Remote branch check should still be called
    expect(mockWorktreeService.remoteBranchExists).toHaveBeenCalledWith(
      '/repo',
      'feat/test-feature'
    );
    warnSpy.mockRestore();
  });

  it('should skip remote deleteBranch when remoteBranchExists returns false', async () => {
    const feature = createMockFeature();
    mockFeatureRepo.findById = vi.fn().mockResolvedValue(feature);
    mockWorktreeService.remoteBranchExists = vi.fn().mockResolvedValue(false);

    await useCase.execute('feat-123-full-uuid');

    // deleteBranch should only be called once (local, not remote)
    expect(mockGitPrService.deleteBranch).toHaveBeenCalledTimes(1);
    expect(mockGitPrService.deleteBranch).not.toHaveBeenCalledWith(
      '/repo',
      'feat/test-feature',
      true
    );
  });

  it('should log warn and resolve without error when remoteBranchExists throws', async () => {
    const feature = createMockFeature();
    mockFeatureRepo.findById = vi.fn().mockResolvedValue(feature);
    mockWorktreeService.remoteBranchExists = vi.fn().mockRejectedValue(new Error('network error'));
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    await expect(useCase.execute('feat-123-full-uuid')).resolves.toBeUndefined();

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('CleanupFeatureWorktreeUseCase'),
      expect.anything()
    );
    warnSpy.mockRestore();
  });

  it('should not reject even when all three steps throw', async () => {
    const feature = createMockFeature();
    mockFeatureRepo.findById = vi.fn().mockResolvedValue(feature);
    mockWorktreeService.remove = vi.fn().mockRejectedValue(new Error('remove failed'));
    mockGitPrService.deleteBranch = vi.fn().mockRejectedValue(new Error('delete failed'));
    mockWorktreeService.remoteBranchExists = vi.fn().mockRejectedValue(new Error('network error'));
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    await expect(useCase.execute('feat-123-full-uuid')).resolves.toBeUndefined();
  });
});
