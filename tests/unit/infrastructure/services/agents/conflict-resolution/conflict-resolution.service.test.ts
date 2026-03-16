import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConflictResolutionService } from '@/infrastructure/services/agents/conflict-resolution/conflict-resolution.service.js';
import type { IAgentExecutorProvider } from '@/application/ports/output/agents/agent-executor-provider.interface.js';
import type { IAgentExecutor } from '@/application/ports/output/agents/agent-executor.interface.js';
import type { IGitPrService } from '@/application/ports/output/services/git-pr-service.interface.js';
import {
  GitPrError,
  GitPrErrorCode,
} from '@/application/ports/output/services/git-pr-service.interface.js';

// Mock fs module
vi.mock('node:fs', () => ({
  readFileSync: vi.fn(),
}));

import { readFileSync } from 'node:fs';
const mockedReadFileSync = vi.mocked(readFileSync);

function createMockExecutor(): IAgentExecutor {
  return {
    agentType: 'ClaudeCode' as never,
    execute: vi.fn().mockResolvedValue({ result: 'resolved' }),
    executeStream: vi.fn(),
    supportsFeature: vi.fn().mockReturnValue(false),
  };
}

function createMockProvider(executor: IAgentExecutor): IAgentExecutorProvider {
  return {
    getExecutor: vi.fn().mockResolvedValue(executor),
  };
}

function createMockGitPrService(): IGitPrService {
  return {
    getConflictedFiles: vi.fn().mockResolvedValue([]),
    stageFiles: vi.fn().mockResolvedValue(undefined),
    rebaseContinue: vi.fn().mockResolvedValue(undefined),
    rebaseAbort: vi.fn().mockResolvedValue(undefined),
    // Other methods (not used by ConflictResolutionService)
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
    getDefaultBranch: vi.fn(),
    revParse: vi.fn(),
    getFailureLogs: vi.fn(),
    syncMain: vi.fn(),
    rebaseOnMain: vi.fn(),
  } as unknown as IGitPrService;
}

describe('ConflictResolutionService', () => {
  let service: ConflictResolutionService;
  let mockExecutor: IAgentExecutor;
  let mockProvider: IAgentExecutorProvider;
  let mockGitPrService: IGitPrService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockExecutor = createMockExecutor();
    mockProvider = createMockProvider(mockExecutor);
    mockGitPrService = createMockGitPrService();
    service = new ConflictResolutionService(mockProvider, mockGitPrService);
  });

  it('should resolve conflicts on first attempt — stages and continues', async () => {
    // Setup: one conflicted file
    vi.mocked(mockGitPrService.getConflictedFiles).mockResolvedValue(['src/index.ts']);

    // First read: file has conflict markers (before agent resolves)
    // Second read (validation): file is clean after agent resolves
    mockedReadFileSync
      .mockReturnValueOnce('<<<<<<< HEAD\nbase\n=======\nfeature\n>>>>>>> feat/x' as never)
      .mockReturnValueOnce('merged content with no markers' as never);

    await service.resolve('/repo', 'feat/x', 'main');

    expect(mockExecutor.execute).toHaveBeenCalledTimes(1);
    expect(mockGitPrService.stageFiles).toHaveBeenCalledWith('/repo', ['src/index.ts']);
    expect(mockGitPrService.rebaseContinue).toHaveBeenCalledWith('/repo');
    expect(mockGitPrService.rebaseAbort).not.toHaveBeenCalled();
  });

  it('should retry on failed first attempt and succeed on second', async () => {
    vi.mocked(mockGitPrService.getConflictedFiles).mockResolvedValue(['src/index.ts']);

    // Attempt 1: read file for prompt, then validation fails (markers still present)
    // Attempt 2: read file for feedback, read for prompt, then validation passes
    mockedReadFileSync
      // Attempt 1: read for prompt
      .mockReturnValueOnce('<<<<<<< HEAD\nbase\n=======\nfeature\n>>>>>>> feat/x' as never)
      // Attempt 1: validation — still has markers
      .mockReturnValueOnce('<<<<<<< HEAD\nbase\n=======\nfeature\n>>>>>>> feat/x' as never)
      // Attempt 2: buildFeedbackFromRemainingMarkers
      .mockReturnValueOnce('<<<<<<< HEAD\nbase\n=======\nfeature\n>>>>>>> feat/x' as never)
      // Attempt 2: read for prompt
      .mockReturnValueOnce('<<<<<<< HEAD\nbase\n=======\nfeature\n>>>>>>> feat/x' as never)
      // Attempt 2: validation — clean
      .mockReturnValueOnce('merged content' as never);

    await service.resolve('/repo', 'feat/x', 'main');

    expect(mockExecutor.execute).toHaveBeenCalledTimes(2);
    expect(mockGitPrService.stageFiles).toHaveBeenCalledWith('/repo', ['src/index.ts']);
    expect(mockGitPrService.rebaseContinue).toHaveBeenCalledWith('/repo');
  });

  it('should abort rebase after 3 failed attempts and throw REBASE_CONFLICT', async () => {
    vi.mocked(mockGitPrService.getConflictedFiles).mockResolvedValue(['src/index.ts']);

    // All reads return file with conflict markers (agent never succeeds)
    mockedReadFileSync.mockReturnValue(
      '<<<<<<< HEAD\nbase\n=======\nfeature\n>>>>>>> feat/x' as never
    );

    const error = await service.resolve('/repo', 'feat/x', 'main').catch((e) => e);

    expect(error).toBeInstanceOf(GitPrError);
    expect(error.code).toBe(GitPrErrorCode.REBASE_CONFLICT);
    expect(error.message).toContain('Failed to resolve conflicts after 3 attempts');
    expect(error.message).toContain('src/index.ts');

    expect(mockExecutor.execute).toHaveBeenCalledTimes(3);
    expect(mockGitPrService.rebaseAbort).toHaveBeenCalledWith('/repo');
    expect(mockGitPrService.stageFiles).not.toHaveBeenCalled();
  });

  it('should handle multi-commit rebase — resolves first commit then second', async () => {
    // First call: one conflicted file
    // After rebaseContinue: throws REBASE_CONFLICT (next commit has conflicts)
    // Second call: different conflicted file
    // After second rebaseContinue: succeeds

    vi.mocked(mockGitPrService.getConflictedFiles)
      .mockResolvedValueOnce(['src/a.ts']) // First commit conflicts
      .mockResolvedValueOnce(['src/b.ts']); // Second commit conflicts

    // First commit resolution
    mockedReadFileSync
      // Read for prompt (first commit)
      .mockReturnValueOnce('<<<<<<< HEAD\na\n=======\nb\n>>>>>>> feat/x' as never)
      // Validation (first commit) — clean
      .mockReturnValueOnce('resolved a' as never)
      // Read for prompt (second commit)
      .mockReturnValueOnce('<<<<<<< HEAD\nc\n=======\nd\n>>>>>>> feat/x' as never)
      // Validation (second commit) — clean
      .mockReturnValueOnce('resolved b' as never);

    vi.mocked(mockGitPrService.rebaseContinue)
      .mockRejectedValueOnce(
        new GitPrError('Rebase continue encountered new conflicts', GitPrErrorCode.REBASE_CONFLICT)
      )
      .mockResolvedValueOnce(undefined);

    await service.resolve('/repo', 'feat/x', 'main');

    expect(mockExecutor.execute).toHaveBeenCalledTimes(2);
    expect(mockGitPrService.stageFiles).toHaveBeenCalledTimes(2);
    expect(mockGitPrService.stageFiles).toHaveBeenCalledWith('/repo', ['src/a.ts']);
    expect(mockGitPrService.stageFiles).toHaveBeenCalledWith('/repo', ['src/b.ts']);
    expect(mockGitPrService.rebaseContinue).toHaveBeenCalledTimes(2);
  });

  it('should return immediately when no conflicted files are found', async () => {
    vi.mocked(mockGitPrService.getConflictedFiles).mockResolvedValue([]);

    await service.resolve('/repo', 'feat/x', 'main');

    expect(mockExecutor.execute).not.toHaveBeenCalled();
    expect(mockGitPrService.stageFiles).not.toHaveBeenCalled();
    expect(mockGitPrService.rebaseContinue).not.toHaveBeenCalled();
  });

  it('should pass cwd to executor options', async () => {
    vi.mocked(mockGitPrService.getConflictedFiles).mockResolvedValue(['src/index.ts']);

    mockedReadFileSync
      .mockReturnValueOnce('<<<<<<< HEAD\na\n=======\nb\n>>>>>>> feat/x' as never)
      .mockReturnValueOnce('clean' as never);

    await service.resolve('/my/worktree', 'feat/x', 'main');

    expect(mockExecutor.execute).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ cwd: '/my/worktree' })
    );
  });
});
