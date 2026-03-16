/**
 * SyncForkMainUseCase Unit Tests
 *
 * TDD Phase: RED-GREEN
 */

import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SyncForkMainUseCase } from '@/application/use-cases/sync-fork-main.use-case.js';
import type { IGitPrService } from '@/application/ports/output/services/git-pr-service.interface.js';

describe('SyncForkMainUseCase', () => {
  let useCase: SyncForkMainUseCase;
  let mockGitPrService: IGitPrService;

  beforeEach(() => {
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

    useCase = new SyncForkMainUseCase(mockGitPrService);
  });

  it('returns { synced: false, reason: "not-a-fork" } for non-fork repos', async () => {
    (mockGitPrService.isFork as ReturnType<typeof vi.fn>).mockResolvedValue({
      isFork: false,
    });

    const result = await useCase.execute('/repo/cwd');

    expect(result).toEqual({ synced: false, reason: 'not-a-fork' });
    expect(mockGitPrService.syncForkMain).not.toHaveBeenCalled();
  });

  it('calls syncForkMain and returns { synced: true, upstreamUrl } for fork repos', async () => {
    const upstreamUrl = 'https://github.com/org/repo.git';
    (mockGitPrService.isFork as ReturnType<typeof vi.fn>).mockResolvedValue({
      isFork: true,
      upstreamUrl,
    });

    const result = await useCase.execute('/repo/cwd');

    expect(mockGitPrService.ensureUpstreamRemote).toHaveBeenCalledWith('/repo/cwd', upstreamUrl);
    expect(mockGitPrService.syncForkMain).toHaveBeenCalledWith('/repo/cwd');
    expect(result).toEqual({ synced: true, upstreamUrl });
  });

  it('propagates errors from isFork', async () => {
    const error = new Error('gh CLI not found');
    (mockGitPrService.isFork as ReturnType<typeof vi.fn>).mockRejectedValue(error);

    await expect(useCase.execute('/repo/cwd')).rejects.toThrow('gh CLI not found');
  });

  it('propagates errors from syncForkMain', async () => {
    (mockGitPrService.isFork as ReturnType<typeof vi.fn>).mockResolvedValue({
      isFork: true,
      upstreamUrl: 'https://github.com/org/repo.git',
    });
    const error = new Error('fetch failed');
    (mockGitPrService.syncForkMain as ReturnType<typeof vi.fn>).mockRejectedValue(error);

    await expect(useCase.execute('/repo/cwd')).rejects.toThrow('fetch failed');
  });
});
