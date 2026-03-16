import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RebaseFeatureOnMainUseCase } from '@/application/use-cases/features/rebase-feature-on-main.use-case.js';
import type { IFeatureRepository } from '@/application/ports/output/repositories/feature-repository.interface.js';
import type { IGitPrService } from '@/application/ports/output/services/git-pr-service.interface.js';
import {
  GitPrError,
  GitPrErrorCode,
} from '@/application/ports/output/services/git-pr-service.interface.js';
import type { IWorktreeService } from '@/application/ports/output/services/worktree-service.interface.js';
import type { ConflictResolutionService } from '@/infrastructure/services/agents/conflict-resolution/conflict-resolution.service.js';
import type { Feature } from '@/domain/generated/output.js';
import { SdlcLifecycle } from '@/domain/generated/output.js';

function createMockFeatureRepo(): IFeatureRepository {
  return {
    create: vi.fn(),
    findById: vi.fn().mockResolvedValue(null),
    findByIdPrefix: vi.fn().mockResolvedValue(null),
    findBySlug: vi.fn().mockResolvedValue(null),
    list: vi.fn().mockResolvedValue([]),
    update: vi.fn(),
    findByParentId: vi.fn().mockResolvedValue([]),
    delete: vi.fn(),
    softDelete: vi.fn(),
  };
}

function createMockGitPrService(): IGitPrService {
  return {
    getDefaultBranch: vi.fn().mockResolvedValue('main'),
    syncMain: vi.fn().mockResolvedValue(undefined),
    rebaseOnMain: vi.fn().mockResolvedValue(undefined),
    createBranch: vi.fn(),
    checkoutBranch: vi.fn(),
    hasUncommittedChanges: vi.fn(),
    hasRemote: vi.fn(),
    push: vi.fn(),
    createPr: vi.fn(),
    mergePr: vi.fn(),
    localMergeSquash: vi.fn(),
    getCiStatus: vi.fn(),
    watchCi: vi.fn(),
    deleteBranch: vi.fn(),
    getPrDiffSummary: vi.fn(),
    getFileDiffs: vi.fn(),
    listPrStatuses: vi.fn(),
    getMergeableStatus: vi.fn(),
    verifyMerge: vi.fn(),
    revParse: vi.fn(),
    getFailureLogs: vi.fn(),
    getConflictedFiles: vi.fn(),
    stageFiles: vi.fn(),
    rebaseContinue: vi.fn(),
    rebaseAbort: vi.fn(),
  } as unknown as IGitPrService;
}

function createMockWorktreeService(): IWorktreeService {
  return {
    create: vi.fn(),
    remove: vi.fn(),
    list: vi.fn(),
    exists: vi.fn().mockResolvedValue(false),
    branchExists: vi.fn(),
    remoteBranchExists: vi.fn(),
    getWorktreePath: vi.fn().mockReturnValue('/repo/.worktrees/feat-x'),
    prune: vi.fn(),
    ensureGitRepository: vi.fn(),
  };
}

function createMockConflictResolution(): ConflictResolutionService {
  return {
    resolve: vi.fn().mockResolvedValue(undefined),
  } as unknown as ConflictResolutionService;
}

const sampleFeature: Feature = {
  id: 'feat-abc-123',
  name: 'My Feature',
  slug: 'my-feature',
  userQuery: 'add something',
  description: 'A test feature',
  repositoryPath: '/home/user/my-project',
  branch: 'feat/my-feature',
  lifecycle: SdlcLifecycle.Implementation,
  messages: [],
  relatedArtifacts: [],
  fast: false,
  push: false,
  openPr: false,
  approvalGates: { allowPrd: true, allowPlan: true, allowMerge: true },
  createdAt: new Date(),
  updatedAt: new Date(),
} as Feature;

describe('RebaseFeatureOnMainUseCase', () => {
  let useCase: RebaseFeatureOnMainUseCase;
  let mockFeatureRepo: IFeatureRepository;
  let mockGitPrService: IGitPrService;
  let mockWorktreeService: IWorktreeService;
  let mockConflictResolution: ConflictResolutionService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockFeatureRepo = createMockFeatureRepo();
    mockGitPrService = createMockGitPrService();
    mockWorktreeService = createMockWorktreeService();
    mockConflictResolution = createMockConflictResolution();
    useCase = new RebaseFeatureOnMainUseCase(
      mockFeatureRepo,
      mockGitPrService,
      mockWorktreeService,
      mockConflictResolution
    );
  });

  it('should sync main and rebase cleanly on happy path', async () => {
    vi.mocked(mockFeatureRepo.findById).mockResolvedValue(sampleFeature);

    await useCase.execute('feat-abc-123');

    expect(mockGitPrService.getDefaultBranch).toHaveBeenCalledWith('/home/user/my-project');
    expect(mockGitPrService.syncMain).toHaveBeenCalledWith('/home/user/my-project', 'main');
    expect(mockGitPrService.rebaseOnMain).toHaveBeenCalledWith(
      '/home/user/my-project',
      'feat/my-feature',
      'main'
    );
    expect(mockConflictResolution.resolve).not.toHaveBeenCalled();
  });

  it('should throw when feature not found', async () => {
    vi.mocked(mockFeatureRepo.findById).mockResolvedValue(null);
    vi.mocked(mockFeatureRepo.findByIdPrefix).mockResolvedValue(null);

    await expect(useCase.execute('non-existent')).rejects.toThrow(
      'Feature not found: "non-existent"'
    );

    expect(mockGitPrService.syncMain).not.toHaveBeenCalled();
    expect(mockGitPrService.rebaseOnMain).not.toHaveBeenCalled();
  });

  it('should resolve feature by prefix when exact ID not found', async () => {
    vi.mocked(mockFeatureRepo.findById).mockResolvedValue(null);
    vi.mocked(mockFeatureRepo.findByIdPrefix).mockResolvedValue(sampleFeature);

    await useCase.execute('feat-abc');

    expect(mockFeatureRepo.findById).toHaveBeenCalledWith('feat-abc');
    expect(mockFeatureRepo.findByIdPrefix).toHaveBeenCalledWith('feat-abc');
    expect(mockGitPrService.rebaseOnMain).toHaveBeenCalled();
  });

  it('should use worktree path as cwd when worktree exists', async () => {
    vi.mocked(mockFeatureRepo.findById).mockResolvedValue(sampleFeature);
    vi.mocked(mockWorktreeService.exists).mockResolvedValue(true);
    vi.mocked(mockWorktreeService.getWorktreePath).mockReturnValue(
      '/home/user/my-project/.worktrees/feat-my-feature'
    );

    await useCase.execute('feat-abc-123');

    expect(mockWorktreeService.exists).toHaveBeenCalledWith(
      '/home/user/my-project',
      'feat/my-feature'
    );
    expect(mockGitPrService.syncMain).toHaveBeenCalledWith(
      '/home/user/my-project/.worktrees/feat-my-feature',
      'main'
    );
    expect(mockGitPrService.rebaseOnMain).toHaveBeenCalledWith(
      '/home/user/my-project/.worktrees/feat-my-feature',
      'feat/my-feature',
      'main'
    );
  });

  it('should use repo root as cwd when no worktree exists', async () => {
    vi.mocked(mockFeatureRepo.findById).mockResolvedValue(sampleFeature);
    vi.mocked(mockWorktreeService.exists).mockResolvedValue(false);

    await useCase.execute('feat-abc-123');

    expect(mockGitPrService.syncMain).toHaveBeenCalledWith('/home/user/my-project', 'main');
    expect(mockGitPrService.rebaseOnMain).toHaveBeenCalledWith(
      '/home/user/my-project',
      'feat/my-feature',
      'main'
    );
  });

  it('should delegate to conflict resolution service on REBASE_CONFLICT', async () => {
    vi.mocked(mockFeatureRepo.findById).mockResolvedValue(sampleFeature);
    vi.mocked(mockGitPrService.rebaseOnMain).mockRejectedValue(
      new GitPrError('Rebase conflicts detected', GitPrErrorCode.REBASE_CONFLICT)
    );

    await useCase.execute('feat-abc-123');

    expect(mockConflictResolution.resolve).toHaveBeenCalledWith(
      '/home/user/my-project',
      'feat/my-feature',
      'main'
    );
  });

  it('should propagate conflict resolution failure', async () => {
    vi.mocked(mockFeatureRepo.findById).mockResolvedValue(sampleFeature);
    vi.mocked(mockGitPrService.rebaseOnMain).mockRejectedValue(
      new GitPrError('Rebase conflicts', GitPrErrorCode.REBASE_CONFLICT)
    );
    vi.mocked(mockConflictResolution.resolve).mockRejectedValue(
      new GitPrError('Failed to resolve after 3 attempts', GitPrErrorCode.REBASE_CONFLICT)
    );

    const error = await useCase.execute('feat-abc-123').catch((e) => e);

    expect(error).toBeInstanceOf(GitPrError);
    expect(error.code).toBe(GitPrErrorCode.REBASE_CONFLICT);
  });

  it('should propagate SYNC_FAILED error without attempting rebase', async () => {
    vi.mocked(mockFeatureRepo.findById).mockResolvedValue(sampleFeature);
    vi.mocked(mockGitPrService.syncMain).mockRejectedValue(
      new GitPrError('Cannot fast-forward', GitPrErrorCode.SYNC_FAILED)
    );

    const error = await useCase.execute('feat-abc-123').catch((e) => e);

    expect(error).toBeInstanceOf(GitPrError);
    expect(error.code).toBe(GitPrErrorCode.SYNC_FAILED);
    expect(mockGitPrService.rebaseOnMain).not.toHaveBeenCalled();
  });

  it('should propagate non-rebase git errors directly', async () => {
    vi.mocked(mockFeatureRepo.findById).mockResolvedValue(sampleFeature);
    vi.mocked(mockGitPrService.rebaseOnMain).mockRejectedValue(
      new GitPrError('Unexpected git failure', GitPrErrorCode.GIT_ERROR)
    );

    const error = await useCase.execute('feat-abc-123').catch((e) => e);

    expect(error).toBeInstanceOf(GitPrError);
    expect(error.code).toBe(GitPrErrorCode.GIT_ERROR);
    expect(mockConflictResolution.resolve).not.toHaveBeenCalled();
  });
});
