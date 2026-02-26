/**
 * CreateFeatureUseCase Unit Tests
 *
 * Tests for creating a new feature with optional parentId support:
 * parent validation, two-gate lifecycle blocking, cascade blocking,
 * deferred agent spawn, and O(depth) cycle detection.
 *
 * TDD Phase: RED-GREEN-REFACTOR
 */

import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/infrastructure/services/settings.service.js', () => ({
  getSettings: vi.fn().mockReturnValue({
    agent: { type: 'claude-code' },
  }),
}));

import { CreateFeatureUseCase } from '@/application/use-cases/features/create/create-feature.use-case.js';
import type { IFeatureRepository } from '@/application/ports/output/repositories/feature-repository.interface.js';
import type { IWorktreeService } from '@/application/ports/output/services/worktree-service.interface.js';
import type { IFeatureAgentProcessService } from '@/application/ports/output/agents/feature-agent-process.interface.js';
import type { IAgentRunRepository } from '@/application/ports/output/agents/agent-run-repository.interface.js';
import type { ISpecInitializerService } from '@/application/ports/output/services/spec-initializer.interface.js';
import type { IRepositoryRepository } from '@/application/ports/output/repositories/repository-repository.interface.js';
import type { IGitPrService } from '@/application/ports/output/services/git-pr-service.interface.js';
import { SdlcLifecycle } from '@/domain/generated/output.js';
import type { Feature } from '@/domain/generated/output.js';
import type { MetadataGenerator } from '@/application/use-cases/features/create/metadata-generator.js';
import type { SlugResolver } from '@/application/use-cases/features/create/slug-resolver.js';
import type { CreateFeatureInput } from '@/application/use-cases/features/create/types.js';
import type { Repository } from '@/domain/generated/output.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const testRepository: Repository = {
  id: 'test-repo-id',
  name: 'repo',
  path: '/repo',
  createdAt: new Date(),
  updatedAt: new Date(),
};

function makeParentFeature(overrides?: Partial<Feature>): Feature {
  return {
    id: 'parent-id',
    name: 'Parent Feature',
    slug: 'parent-feature',
    description: 'The parent feature',
    userQuery: 'parent query',
    repositoryPath: '/repo',
    branch: 'feat/parent-feature',
    lifecycle: SdlcLifecycle.Implementation,
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

// ---------------------------------------------------------------------------
// Test Suite
// ---------------------------------------------------------------------------

describe('CreateFeatureUseCase', () => {
  let useCase: CreateFeatureUseCase;
  let mockFeatureRepo: IFeatureRepository;
  let mockWorktreeService: IWorktreeService;
  let mockAgentProcess: IFeatureAgentProcessService;
  let mockRunRepo: IAgentRunRepository;
  let mockSpecInitializer: ISpecInitializerService;
  let mockMetadataGenerator: MetadataGenerator;
  let mockSlugResolver: SlugResolver;
  let mockRepositoryRepo: IRepositoryRepository;
  let mockGitPrService: IGitPrService;

  const baseInput: CreateFeatureInput = {
    userInput: 'Add authentication',
    repositoryPath: '/repo',
  };

  beforeEach(() => {
    mockFeatureRepo = {
      create: vi.fn().mockResolvedValue(undefined),
      findById: vi.fn().mockResolvedValue(null),
      findByIdPrefix: vi.fn().mockResolvedValue(null),
      findBySlug: vi.fn().mockResolvedValue(null),
      list: vi.fn().mockResolvedValue([]),
      findByParentId: vi.fn().mockResolvedValue([]),
      update: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
    };

    mockWorktreeService = {
      create: vi.fn().mockResolvedValue(undefined),
      remove: vi.fn().mockResolvedValue(undefined),
      list: vi.fn().mockResolvedValue([]),
      exists: vi.fn().mockResolvedValue(false),
      branchExists: vi.fn().mockResolvedValue(false),
      remoteBranchExists: vi.fn().mockResolvedValue(false),
      getWorktreePath: vi.fn().mockReturnValue('/worktrees/test-feature'),
      ensureGitRepository: vi.fn().mockResolvedValue(undefined),
    };

    mockAgentProcess = {
      spawn: vi.fn().mockReturnValue(123),
      isAlive: vi.fn().mockReturnValue(false),
      checkAndMarkCrashed: vi.fn().mockResolvedValue(undefined),
    };

    mockRunRepo = {
      create: vi.fn().mockResolvedValue(undefined),
      findById: vi.fn().mockResolvedValue(null),
      findByThreadId: vi.fn().mockResolvedValue(null),
      updateStatus: vi.fn().mockResolvedValue(undefined),
      findRunningByPid: vi.fn().mockResolvedValue(null),
      list: vi.fn().mockResolvedValue([]),
      delete: vi.fn().mockResolvedValue(undefined),
    };

    mockSpecInitializer = {
      initialize: vi.fn().mockResolvedValue({
        specDir: '/worktrees/test-feature/specs/001-test-feature',
        featureNumber: '001',
      }),
    };

    mockMetadataGenerator = {
      generateMetadata: vi.fn().mockResolvedValue({
        slug: 'test-feature',
        name: 'Test Feature',
        description: 'A test feature',
      }),
    } as unknown as MetadataGenerator;

    mockSlugResolver = {
      resolveUniqueSlug: vi.fn().mockResolvedValue({
        slug: 'test-feature',
        branch: 'feat/test-feature',
        warning: undefined,
      }),
    } as unknown as SlugResolver;

    mockRepositoryRepo = {
      create: vi.fn().mockResolvedValue(testRepository),
      findById: vi.fn().mockResolvedValue(null),
      findByPath: vi.fn().mockResolvedValue(null),
      findByPathIncludingDeleted: vi.fn().mockResolvedValue(null),
      list: vi.fn().mockResolvedValue([]),
      remove: vi.fn().mockResolvedValue(undefined),
      softDelete: vi.fn().mockResolvedValue(undefined),
      restore: vi.fn().mockResolvedValue(undefined),
    };

    mockGitPrService = {
      getDefaultBranch: vi.fn().mockResolvedValue('main'),
      createPr: vi.fn().mockResolvedValue(undefined),
      getPr: vi.fn().mockResolvedValue(null),
    } as unknown as IGitPrService;

    useCase = new CreateFeatureUseCase(
      mockFeatureRepo,
      mockWorktreeService,
      mockAgentProcess,
      mockRunRepo,
      mockSpecInitializer,
      mockMetadataGenerator,
      mockSlugResolver,
      mockRepositoryRepo,
      mockGitPrService
    );
  });

  // -------------------------------------------------------------------------
  // Baseline: no parentId — existing behavior is unchanged
  // -------------------------------------------------------------------------

  describe('without parentId (baseline)', () => {
    it('should create a feature and spawn the agent', async () => {
      const result = await useCase.execute(baseInput);

      expect(result.feature).toBeDefined();
      expect(result.feature.lifecycle).toBe(SdlcLifecycle.Requirements);
      expect(mockFeatureRepo.create).toHaveBeenCalledOnce();
      expect(mockAgentProcess.spawn).toHaveBeenCalledOnce();
    });

    it('should persist the feature with no parentId', async () => {
      const result = await useCase.execute(baseInput);

      expect(result.feature.parentId).toBeUndefined();
    });
  });

  // -------------------------------------------------------------------------
  // task-5: CreateFeatureInput accepts parentId field
  // -------------------------------------------------------------------------

  it('should accept parentId in the input without TypeScript errors', async () => {
    const parent = makeParentFeature({ lifecycle: SdlcLifecycle.Maintain });
    mockFeatureRepo.findById = vi.fn().mockResolvedValue(parent);

    const inputWithParent: CreateFeatureInput = {
      ...baseInput,
      parentId: 'parent-id',
    };

    // If this compiles and runs, the field exists in the type
    const result = await useCase.execute(inputWithParent);
    expect(result.feature.parentId).toBe('parent-id');
  });

  // -------------------------------------------------------------------------
  // task-6: Parent validation
  // -------------------------------------------------------------------------

  describe('with parentId — parent validation', () => {
    it('should throw when parentId references a non-existent feature', async () => {
      mockFeatureRepo.findById = vi.fn().mockResolvedValue(null);

      await expect(useCase.execute({ ...baseInput, parentId: 'non-existent-id' })).rejects.toThrow(
        'Parent feature not found: non-existent-id'
      );
    });
  });

  // -------------------------------------------------------------------------
  // task-6: Two-gate lifecycle logic
  // -------------------------------------------------------------------------

  describe('with parentId — gate logic (child lifecycle)', () => {
    it('should create child in Blocked state when parent lifecycle is Blocked', async () => {
      const parent = makeParentFeature({ lifecycle: SdlcLifecycle.Blocked });
      mockFeatureRepo.findById = vi.fn().mockResolvedValue(parent);

      const result = await useCase.execute({ ...baseInput, parentId: 'parent-id' });

      expect(result.feature.lifecycle).toBe(SdlcLifecycle.Blocked);
      expect(mockAgentProcess.spawn).not.toHaveBeenCalled();
    });

    it('should create child in Blocked state when parent lifecycle is Started', async () => {
      const parent = makeParentFeature({ lifecycle: SdlcLifecycle.Started });
      mockFeatureRepo.findById = vi.fn().mockResolvedValue(parent);

      const result = await useCase.execute({ ...baseInput, parentId: 'parent-id' });

      expect(result.feature.lifecycle).toBe(SdlcLifecycle.Blocked);
      expect(mockAgentProcess.spawn).not.toHaveBeenCalled();
    });

    it('should create child in Blocked state when parent lifecycle is Planning (< Implementation)', async () => {
      const parent = makeParentFeature({ lifecycle: SdlcLifecycle.Planning });
      mockFeatureRepo.findById = vi.fn().mockResolvedValue(parent);

      const result = await useCase.execute({ ...baseInput, parentId: 'parent-id' });

      expect(result.feature.lifecycle).toBe(SdlcLifecycle.Blocked);
      expect(mockAgentProcess.spawn).not.toHaveBeenCalled();
    });

    it('should create child in Started state when parent lifecycle is Implementation', async () => {
      const parent = makeParentFeature({ lifecycle: SdlcLifecycle.Implementation });
      mockFeatureRepo.findById = vi.fn().mockResolvedValue(parent);

      const result = await useCase.execute({ ...baseInput, parentId: 'parent-id' });

      expect(result.feature.lifecycle).toBe(SdlcLifecycle.Started);
      expect(mockAgentProcess.spawn).toHaveBeenCalledOnce();
    });

    it('should create child in Started state when parent lifecycle is Review', async () => {
      const parent = makeParentFeature({ lifecycle: SdlcLifecycle.Review });
      mockFeatureRepo.findById = vi.fn().mockResolvedValue(parent);

      const result = await useCase.execute({ ...baseInput, parentId: 'parent-id' });

      expect(result.feature.lifecycle).toBe(SdlcLifecycle.Started);
      expect(mockAgentProcess.spawn).toHaveBeenCalledOnce();
    });

    it('should create child in Started state when parent lifecycle is Maintain', async () => {
      const parent = makeParentFeature({ lifecycle: SdlcLifecycle.Maintain });
      mockFeatureRepo.findById = vi.fn().mockResolvedValue(parent);

      const result = await useCase.execute({ ...baseInput, parentId: 'parent-id' });

      expect(result.feature.lifecycle).toBe(SdlcLifecycle.Started);
      expect(mockAgentProcess.spawn).toHaveBeenCalledOnce();
    });
  });

  // -------------------------------------------------------------------------
  // task-6: parentId persisted on the created feature
  // -------------------------------------------------------------------------

  describe('with parentId — persistence', () => {
    it('should persist parentId on the created feature', async () => {
      const parent = makeParentFeature({ lifecycle: SdlcLifecycle.Implementation });
      mockFeatureRepo.findById = vi.fn().mockResolvedValue(parent);

      const result = await useCase.execute({ ...baseInput, parentId: 'parent-id' });

      expect(result.feature.parentId).toBe('parent-id');
      // The feature passed to featureRepo.create should also have parentId
      const savedFeature = (mockFeatureRepo.create as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(savedFeature.parentId).toBe('parent-id');
    });
  });

  // -------------------------------------------------------------------------
  // Child uses parent's repositoryPath, not caller's cwd
  // -------------------------------------------------------------------------

  describe('with parentId — repositoryPath resolution', () => {
    it('should use parent repositoryPath instead of input repositoryPath', async () => {
      const parent = makeParentFeature({
        lifecycle: SdlcLifecycle.Implementation,
        repositoryPath: '/original/repo',
      });
      mockFeatureRepo.findById = vi.fn().mockResolvedValue(parent);

      const result = await useCase.execute({
        ...baseInput,
        repositoryPath: '/original/repo/wt/parent-feature', // caller is in a worktree
        parentId: 'parent-id',
      });

      // The child feature should store the parent's repo path, not the worktree path
      expect(result.feature.repositoryPath).toBe('/original/repo');

      // Worktree and slug resolution should also use the original repo path
      expect(mockWorktreeService.ensureGitRepository).toHaveBeenCalledWith('/original/repo');
      expect(mockSlugResolver.resolveUniqueSlug).toHaveBeenCalledWith(
        expect.any(String),
        '/original/repo'
      );
      expect(mockGitPrService.getDefaultBranch).toHaveBeenCalledWith('/original/repo');
      expect(mockWorktreeService.getWorktreePath).toHaveBeenCalledWith(
        '/original/repo',
        expect.any(String)
      );
    });

    it('should use input repositoryPath when no parentId is given', async () => {
      const result = await useCase.execute({
        ...baseInput,
        repositoryPath: '/my/repo',
      });

      expect(result.feature.repositoryPath).toBe('/my/repo');
      expect(mockWorktreeService.ensureGitRepository).toHaveBeenCalledWith('/my/repo');
    });
  });

  // -------------------------------------------------------------------------
  // task-7: Cycle detection
  // -------------------------------------------------------------------------

  describe('cycle detection', () => {
    it('should reject a self-reference (A → A)', async () => {
      // Feature tries to set itself as its own parent
      // We need to simulate the use case where the new feature would have
      // its own ID as parentId. We can do this by giving the parent the same
      // ID that will be used as the new feature ID.
      //
      // Since the new feature ID is randomUUID() we can't predict it.
      // Instead we test via a chain: parent.parentId = <same as proposed new feature id>
      // is not testable without controlling UUID generation.
      //
      // Instead, we test a case where the parent's ancestor chain includes
      // a cycle: parent.parentId references a grandparent, and so on.
      //
      // For the self-reference case, we create a parent whose parentId loops back:
      // parent.id = "parent-id", parent.parentId = "parent-id" (self-loop)
      const selfLoopParent = makeParentFeature({
        id: 'parent-id',
        parentId: 'parent-id',
        lifecycle: SdlcLifecycle.Implementation,
      });
      mockFeatureRepo.findById = vi.fn().mockImplementation((id: string) => {
        if (id === 'parent-id') return Promise.resolve(selfLoopParent);
        return Promise.resolve(null);
      });

      await expect(useCase.execute({ ...baseInput, parentId: 'parent-id' })).rejects.toThrow(
        /[Cc]ycle/
      );
    });

    it('should reject a two-node cycle (A.parentId → B, B.parentId → A)', async () => {
      // parent A has parentId = B, B has parentId = A
      const featureA = makeParentFeature({
        id: 'feature-a',
        parentId: 'feature-b',
        lifecycle: SdlcLifecycle.Implementation,
      });
      const featureB = makeParentFeature({
        id: 'feature-b',
        parentId: 'feature-a',
        lifecycle: SdlcLifecycle.Implementation,
      });
      mockFeatureRepo.findById = vi.fn().mockImplementation((id: string) => {
        if (id === 'feature-a') return Promise.resolve(featureA);
        if (id === 'feature-b') return Promise.resolve(featureB);
        return Promise.resolve(null);
      });

      // New feature tries to become a child of A — but A → B → A is a cycle
      // that the new feature would be inserted into
      await expect(useCase.execute({ ...baseInput, parentId: 'feature-a' })).rejects.toThrow(
        /[Cc]ycle/
      );
    });

    it('should reject a deep cycle (A → B → C → D → A)', async () => {
      const featureA = makeParentFeature({
        id: 'a',
        parentId: 'b',
        lifecycle: SdlcLifecycle.Implementation,
      });
      const featureB = makeParentFeature({
        id: 'b',
        parentId: 'c',
        lifecycle: SdlcLifecycle.Implementation,
      });
      const featureC = makeParentFeature({
        id: 'c',
        parentId: 'd',
        lifecycle: SdlcLifecycle.Implementation,
      });
      const featureD = makeParentFeature({
        id: 'd',
        parentId: 'a',
        lifecycle: SdlcLifecycle.Implementation,
      });

      mockFeatureRepo.findById = vi.fn().mockImplementation((id: string) => {
        const map: Record<string, Feature> = { a: featureA, b: featureB, c: featureC, d: featureD };
        return Promise.resolve(map[id] ?? null);
      });

      await expect(useCase.execute({ ...baseInput, parentId: 'a' })).rejects.toThrow(/[Cc]ycle/);
    });

    it('should allow a valid deep chain without cycles (A → B → C)', async () => {
      // C is the root (no parentId), B is a child of C, A is a child of B
      // New feature becomes a child of A — valid, no cycle
      const featureC = makeParentFeature({
        id: 'c',
        parentId: undefined,
        lifecycle: SdlcLifecycle.Implementation,
      });
      const featureB = makeParentFeature({
        id: 'b',
        parentId: 'c',
        lifecycle: SdlcLifecycle.Implementation,
      });
      const featureA = makeParentFeature({
        id: 'a',
        parentId: 'b',
        lifecycle: SdlcLifecycle.Implementation,
      });

      mockFeatureRepo.findById = vi.fn().mockImplementation((id: string) => {
        const map: Record<string, Feature> = { a: featureA, b: featureB, c: featureC };
        return Promise.resolve(map[id] ?? null);
      });

      const result = await useCase.execute({ ...baseInput, parentId: 'a' });
      expect(result.feature).toBeDefined();
      expect(result.feature.parentId).toBe('a');
    });
  });

  // -------------------------------------------------------------------------
  // Repository creation guard
  // -------------------------------------------------------------------------

  describe('repository creation guard', () => {
    it('throws if repositoryRepo.create() returns falsy', async () => {
      mockRepositoryRepo.findByPath = vi.fn().mockResolvedValue(null);
      mockRepositoryRepo.create = vi.fn().mockResolvedValue(null as any);

      await expect(useCase.execute(baseInput)).rejects.toThrow(
        'Failed to create or retrieve repository record'
      );
    });
  });
});
