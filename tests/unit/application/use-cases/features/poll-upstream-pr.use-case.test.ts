/**
 * PollUpstreamPrUseCase Unit Tests
 *
 * Tests checking upstream PR status and transitioning lifecycle to Maintain on merge.
 *
 * TDD Phase: RED-GREEN
 */

import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PollUpstreamPrUseCase } from '@/application/use-cases/features/poll-upstream-pr.use-case';
import { SdlcLifecycle, PrStatus } from '@/domain/generated/output';
import type { IFeatureRepository } from '@/application/ports/output/repositories/feature-repository.interface';
import type { IGitForkService } from '@/application/ports/output/services/git-fork-service.interface';
import type { Feature, PullRequest } from '@/domain/generated/output';

function createMockPr(overrides?: Partial<PullRequest>): PullRequest {
  return {
    url: 'https://github.com/owner/repo/pull/42',
    number: 42,
    status: PrStatus.Open,
    upstreamPrUrl: 'https://github.com/upstream-owner/upstream-repo/pull/7',
    upstreamPrNumber: 7,
    ...overrides,
  };
}

function createMockFeature(overrides?: Partial<Feature>): Feature {
  return {
    id: 'feat-abc-123-uuid',
    name: 'Test Feature',
    slug: 'test-feature',
    description: 'A test feature',
    userQuery: 'test user query',
    repositoryPath: '/repo',
    branch: 'feat/test-feature',
    lifecycle: SdlcLifecycle.AwaitingUpstream,
    messages: [],
    relatedArtifacts: [],
    fast: false,
    push: false,
    openPr: false,
    forkAndPr: false,
    commitSpecs: false,
    approvalGates: { allowPrd: false, allowPlan: false, allowMerge: false },
    pr: createMockPr(),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function createMockFeatureRepo(): Pick<IFeatureRepository, 'findById' | 'update'> {
  return {
    findById: vi.fn().mockResolvedValue(createMockFeature()),
    update: vi.fn().mockResolvedValue(undefined),
  };
}

function createMockForkService(): Pick<IGitForkService, 'getUpstreamPrStatus'> {
  return {
    getUpstreamPrStatus: vi.fn().mockResolvedValue({
      state: 'open',
      url: 'https://github.com/upstream-owner/upstream-repo/pull/7',
      number: 7,
    }),
  };
}

describe('PollUpstreamPrUseCase', () => {
  let useCase: PollUpstreamPrUseCase;
  let mockFeatureRepo: Pick<IFeatureRepository, 'findById' | 'update'>;
  let mockForkService: Pick<IGitForkService, 'getUpstreamPrStatus'>;

  beforeEach(() => {
    mockFeatureRepo = createMockFeatureRepo();
    mockForkService = createMockForkService();
    useCase = new PollUpstreamPrUseCase(mockFeatureRepo, mockForkService);
  });

  describe('upstream PR merged', () => {
    it('should transition lifecycle to Maintain when upstream PR is merged', async () => {
      mockForkService.getUpstreamPrStatus = vi.fn().mockResolvedValue({
        state: 'merged',
        url: 'https://github.com/upstream-owner/upstream-repo/pull/7',
        number: 7,
      });

      const result = await useCase.execute({ featureId: 'feat-abc-123-uuid' });

      expect(result.status).toBe('merged');
      expect(result.transitioned).toBe(true);
    });

    it('should call update with Maintain lifecycle and Merged upstreamPrStatus when merged', async () => {
      mockForkService.getUpstreamPrStatus = vi.fn().mockResolvedValue({
        state: 'merged',
        url: 'https://github.com/upstream-owner/upstream-repo/pull/7',
        number: 7,
      });

      await useCase.execute({ featureId: 'feat-abc-123-uuid' });

      expect(mockFeatureRepo.update).toHaveBeenCalledWith(
        expect.objectContaining({
          lifecycle: SdlcLifecycle.Maintain,
          pr: expect.objectContaining({
            upstreamPrStatus: PrStatus.Merged,
          }),
        })
      );
    });
  });

  describe('upstream PR closed', () => {
    it('should keep lifecycle as AwaitingUpstream when upstream PR is closed', async () => {
      mockForkService.getUpstreamPrStatus = vi.fn().mockResolvedValue({
        state: 'closed',
        url: 'https://github.com/upstream-owner/upstream-repo/pull/7',
        number: 7,
      });

      const result = await useCase.execute({ featureId: 'feat-abc-123-uuid' });

      expect(result.status).toBe('closed');
      expect(result.transitioned).toBe(false);
    });

    it('should set upstreamPrStatus to Closed and call update when closed', async () => {
      mockForkService.getUpstreamPrStatus = vi.fn().mockResolvedValue({
        state: 'closed',
        url: 'https://github.com/upstream-owner/upstream-repo/pull/7',
        number: 7,
      });

      await useCase.execute({ featureId: 'feat-abc-123-uuid' });

      expect(mockFeatureRepo.update).toHaveBeenCalledWith(
        expect.objectContaining({
          lifecycle: SdlcLifecycle.AwaitingUpstream,
          pr: expect.objectContaining({
            upstreamPrStatus: PrStatus.Closed,
          }),
        })
      );
    });
  });

  describe('upstream PR still open', () => {
    it('should return open status and not call update when PR is still open', async () => {
      mockForkService.getUpstreamPrStatus = vi.fn().mockResolvedValue({
        state: 'open',
        url: 'https://github.com/upstream-owner/upstream-repo/pull/7',
        number: 7,
      });

      const result = await useCase.execute({ featureId: 'feat-abc-123-uuid' });

      expect(result.status).toBe('open');
      expect(result.transitioned).toBe(false);
      expect(mockFeatureRepo.update).not.toHaveBeenCalled();
    });
  });

  describe('early return guards', () => {
    it('should return open status without calling fork service when feature is not AwaitingUpstream', async () => {
      mockFeatureRepo.findById = vi
        .fn()
        .mockResolvedValue(createMockFeature({ lifecycle: SdlcLifecycle.Maintain }));

      const result = await useCase.execute({ featureId: 'feat-abc-123-uuid' });

      expect(result.status).toBe('open');
      expect(result.transitioned).toBe(false);
      expect(mockForkService.getUpstreamPrStatus).not.toHaveBeenCalled();
      expect(mockFeatureRepo.update).not.toHaveBeenCalled();
    });

    it('should return open status without calling fork service when feature has no upstream PR data', async () => {
      mockFeatureRepo.findById = vi
        .fn()
        .mockResolvedValue(
          createMockFeature({
            pr: createMockPr({ upstreamPrUrl: undefined, upstreamPrNumber: undefined }),
          })
        );

      const result = await useCase.execute({ featureId: 'feat-abc-123-uuid' });

      expect(result.status).toBe('open');
      expect(result.transitioned).toBe(false);
      expect(mockForkService.getUpstreamPrStatus).not.toHaveBeenCalled();
      expect(mockFeatureRepo.update).not.toHaveBeenCalled();
    });

    it('should return open status without calling fork service when feature has no pr at all', async () => {
      mockFeatureRepo.findById = vi.fn().mockResolvedValue(createMockFeature({ pr: undefined }));

      const result = await useCase.execute({ featureId: 'feat-abc-123-uuid' });

      expect(result.status).toBe('open');
      expect(result.transitioned).toBe(false);
      expect(mockForkService.getUpstreamPrStatus).not.toHaveBeenCalled();
      expect(mockFeatureRepo.update).not.toHaveBeenCalled();
    });
  });

  describe('upstream repo parsing', () => {
    it('should call getUpstreamPrStatus with parsed owner/repo and pr number', async () => {
      // upstreamPrUrl: https://github.com/upstream-owner/upstream-repo/pull/7
      await useCase.execute({ featureId: 'feat-abc-123-uuid' });

      expect(mockForkService.getUpstreamPrStatus).toHaveBeenCalledWith(
        'upstream-owner/upstream-repo',
        7
      );
    });
  });
});
