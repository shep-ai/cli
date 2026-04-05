/**
 * UpdateFeatureParentUseCase Unit Tests
 *
 * Verifies re-parenting behaviour:
 * - Self-reference prevention
 * - Feature not found error handling
 * - Cycle detection
 * - Same-repository check
 * - Gate checks (blocking/unblocking)
 * - Removing a parent (orphaning)
 * - No-op when parentId hasn't changed
 */

import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UpdateFeatureParentUseCase } from '@/application/use-cases/features/update-feature-parent.use-case.js';
import type { IFeatureRepository } from '@/application/ports/output/repositories/feature-repository.interface.js';
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
    lifecycle: SdlcLifecycle.Started,
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

describe('UpdateFeatureParentUseCase', () => {
  let useCase: UpdateFeatureParentUseCase;
  let mockFeatureRepo: IFeatureRepository;

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

    useCase = new UpdateFeatureParentUseCase(mockFeatureRepo);
  });

  // -------------------------------------------------------------------------
  // Validation errors
  // -------------------------------------------------------------------------

  it('should throw when a feature tries to be its own parent', async () => {
    await expect(useCase.execute({ featureId: 'feat-001', parentId: 'feat-001' })).rejects.toThrow(
      'A feature cannot be its own parent'
    );
  });

  it('should throw when child feature is not found', async () => {
    mockFeatureRepo.findById = vi.fn().mockResolvedValue(null);

    await expect(useCase.execute({ featureId: 'missing', parentId: 'parent-001' })).rejects.toThrow(
      'Feature not found: missing'
    );
  });

  it('should throw when parent feature is not found', async () => {
    const child = makeFeature({ id: 'child-001' });
    mockFeatureRepo.findById = vi.fn().mockImplementation(async (id: string) => {
      if (id === 'child-001') return child;
      return null;
    });

    await expect(
      useCase.execute({ featureId: 'child-001', parentId: 'missing-parent' })
    ).rejects.toThrow('Parent feature not found: missing-parent');
  });

  it('should throw when parent and child are in different repositories', async () => {
    const child = makeFeature({ id: 'child-001', repositoryPath: '/repo-a' });
    const parent = makeFeature({ id: 'parent-001', repositoryPath: '/repo-b' });
    mockFeatureRepo.findById = vi.fn().mockImplementation(async (id: string) => {
      if (id === 'child-001') return child;
      if (id === 'parent-001') return parent;
      return null;
    });

    await expect(
      useCase.execute({ featureId: 'child-001', parentId: 'parent-001' })
    ).rejects.toThrow('Parent and child features must belong to the same repository');
  });

  // -------------------------------------------------------------------------
  // Cycle detection
  // -------------------------------------------------------------------------

  it('should throw when setting a parent would create a cycle', async () => {
    // A → B → A (cycle)
    const featureA = makeFeature({ id: 'A', parentId: undefined });
    const featureB = makeFeature({ id: 'B', parentId: 'A' });

    mockFeatureRepo.findById = vi.fn().mockImplementation(async (id: string) => {
      if (id === 'A') return featureA;
      if (id === 'B') return featureB;
      return null;
    });

    // Try to make A a child of B (would create A→B→A cycle)
    await expect(useCase.execute({ featureId: 'A', parentId: 'B' })).rejects.toThrow(
      'Cycle detected'
    );
  });

  // -------------------------------------------------------------------------
  // No-op when unchanged
  // -------------------------------------------------------------------------

  it('should return no-change when parentId is already set to the same value', async () => {
    const child = makeFeature({ id: 'child-001', parentId: 'parent-001' });
    mockFeatureRepo.findById = vi.fn().mockResolvedValue(child);

    const result = await useCase.execute({ featureId: 'child-001', parentId: 'parent-001' });

    expect(result).toEqual({ blocked: false, unblocked: false });
    expect(mockFeatureRepo.update).not.toHaveBeenCalled();
  });

  it('should return no-change when removing parent from feature with no parent', async () => {
    const child = makeFeature({ id: 'child-001', parentId: undefined });
    mockFeatureRepo.findById = vi.fn().mockResolvedValue(child);

    const result = await useCase.execute({ featureId: 'child-001', parentId: null });

    expect(result).toEqual({ blocked: false, unblocked: false });
    expect(mockFeatureRepo.update).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // Setting a parent
  // -------------------------------------------------------------------------

  it('should set parentId and block child when parent is not in POST_IMPLEMENTATION', async () => {
    const child = makeFeature({ id: 'child-001', lifecycle: SdlcLifecycle.Started });
    const parent = makeFeature({ id: 'parent-001', lifecycle: SdlcLifecycle.Planning });

    mockFeatureRepo.findById = vi.fn().mockImplementation(async (id: string) => {
      if (id === 'child-001') return child;
      if (id === 'parent-001') return parent;
      return null;
    });

    const result = await useCase.execute({ featureId: 'child-001', parentId: 'parent-001' });

    expect(result).toEqual({ blocked: true, unblocked: false });
    expect(mockFeatureRepo.update).toHaveBeenCalledOnce();
    const updated = (mockFeatureRepo.update as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(updated.parentId).toBe('parent-001');
    expect(updated.lifecycle).toBe(SdlcLifecycle.Blocked);
  });

  it('should set parentId without blocking when parent is in POST_IMPLEMENTATION', async () => {
    const child = makeFeature({ id: 'child-001', lifecycle: SdlcLifecycle.Started });
    const parent = makeFeature({ id: 'parent-001', lifecycle: SdlcLifecycle.Implementation });

    mockFeatureRepo.findById = vi.fn().mockImplementation(async (id: string) => {
      if (id === 'child-001') return child;
      if (id === 'parent-001') return parent;
      return null;
    });

    const result = await useCase.execute({ featureId: 'child-001', parentId: 'parent-001' });

    expect(result).toEqual({ blocked: false, unblocked: false });
    expect(mockFeatureRepo.update).toHaveBeenCalledOnce();
    const updated = (mockFeatureRepo.update as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(updated.parentId).toBe('parent-001');
    expect(updated.lifecycle).toBe(SdlcLifecycle.Started);
  });

  it('should unblock a blocked child when new parent is in POST_IMPLEMENTATION', async () => {
    const child = makeFeature({
      id: 'child-001',
      lifecycle: SdlcLifecycle.Blocked,
      parentId: 'old-parent',
    });
    const newParent = makeFeature({ id: 'new-parent', lifecycle: SdlcLifecycle.Implementation });

    mockFeatureRepo.findById = vi.fn().mockImplementation(async (id: string) => {
      if (id === 'child-001') return child;
      if (id === 'new-parent') return newParent;
      return null;
    });

    const result = await useCase.execute({ featureId: 'child-001', parentId: 'new-parent' });

    expect(result).toEqual({ blocked: false, unblocked: true });
    const updated = (mockFeatureRepo.update as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(updated.parentId).toBe('new-parent');
    expect(updated.lifecycle).toBe(SdlcLifecycle.Started);
  });

  // -------------------------------------------------------------------------
  // Removing a parent (orphaning)
  // -------------------------------------------------------------------------

  it('should remove parentId and unblock when removing parent from a blocked child', async () => {
    const child = makeFeature({
      id: 'child-001',
      lifecycle: SdlcLifecycle.Blocked,
      parentId: 'parent-001',
    });
    mockFeatureRepo.findById = vi.fn().mockResolvedValue(child);

    const result = await useCase.execute({ featureId: 'child-001', parentId: null });

    expect(result).toEqual({ blocked: false, unblocked: true });
    const updated = (mockFeatureRepo.update as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(updated.parentId).toBeUndefined();
    expect(updated.lifecycle).toBe(SdlcLifecycle.Started);
  });

  it('should remove parentId without lifecycle change for non-blocked child', async () => {
    const child = makeFeature({
      id: 'child-001',
      lifecycle: SdlcLifecycle.Implementation,
      parentId: 'parent-001',
    });
    mockFeatureRepo.findById = vi.fn().mockResolvedValue(child);

    const result = await useCase.execute({ featureId: 'child-001', parentId: null });

    expect(result).toEqual({ blocked: false, unblocked: false });
    const updated = (mockFeatureRepo.update as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(updated.parentId).toBeUndefined();
    expect(updated.lifecycle).toBe(SdlcLifecycle.Implementation);
  });
});
