/**
 * CreateFeatureUseCase Unit Tests
 *
 * Tests for feature creation use case.
 * Uses mock repository and worktree service.
 *
 * TDD Phase: RED-GREEN
 */

import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CreateFeatureUseCase } from '../../../../../src/application/use-cases/features/create-feature.use-case.js';
import type { IFeatureRepository } from '../../../../../src/application/ports/output/feature-repository.interface.js';
import type { IWorktreeService } from '../../../../../src/application/ports/output/worktree-service.interface.js';
import { SdlcLifecycle } from '../../../../../src/domain/generated/output.js';

describe('CreateFeatureUseCase', () => {
  let useCase: CreateFeatureUseCase;
  let mockRepo: IFeatureRepository;
  let mockWorktree: IWorktreeService;

  beforeEach(() => {
    mockRepo = {
      create: vi.fn().mockResolvedValue(undefined),
      findById: vi.fn().mockResolvedValue(null),
      findBySlug: vi.fn().mockResolvedValue(null),
      list: vi.fn().mockResolvedValue([]),
      update: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
    };
    mockWorktree = {
      create: vi.fn().mockResolvedValue({
        path: '/repo/.worktrees/feat/test',
        head: 'abc',
        branch: 'feat/test',
        isMain: false,
      }),
      remove: vi.fn().mockResolvedValue(undefined),
      list: vi.fn().mockResolvedValue([]),
      exists: vi.fn().mockResolvedValue(false),
      getWorktreePath: vi.fn().mockReturnValue('/repo/.worktrees/feat/test'),
    };
    useCase = new CreateFeatureUseCase(mockRepo, mockWorktree);
  });

  it('should create a feature with generated slug', async () => {
    const result = await useCase.execute({
      description: 'Add user authentication',
      repositoryPath: '/home/user/project',
    });
    expect(result.slug).toBe('add-user-authentication');
    expect(result.name).toBe('Add user authentication');
    expect(result.lifecycle).toBe(SdlcLifecycle.Requirements);
    expect(mockRepo.create).toHaveBeenCalledOnce();
  });

  it('should create a git worktree', async () => {
    await useCase.execute({
      description: 'Add user auth',
      repositoryPath: '/home/user/project',
    });
    expect(mockWorktree.create).toHaveBeenCalledOnce();
  });

  it('should generate UUID for feature id', async () => {
    const result = await useCase.execute({
      description: 'Test feature',
      repositoryPath: '/repo',
    });
    expect(result.id).toBeDefined();
    expect(result.id.length).toBeGreaterThan(0);
  });

  it('should set branch to feat/<slug>', async () => {
    const result = await useCase.execute({
      description: 'Add logging',
      repositoryPath: '/repo',
    });
    expect(result.branch).toBe('feat/add-logging');
  });

  it('should handle slug with special characters', async () => {
    const result = await useCase.execute({
      description: 'Fix bug #123 (urgent!)',
      repositoryPath: '/repo',
    });
    expect(result.slug).toMatch(/^[a-z0-9-]+$/);
  });

  it('should throw if slug already exists', async () => {
    mockRepo.findBySlug = vi.fn().mockResolvedValue({ id: 'existing' });
    await expect(
      useCase.execute({
        description: 'Existing feature',
        repositoryPath: '/repo',
      })
    ).rejects.toThrow(/already exists/);
  });

  it('should pass repositoryPath when checking slug uniqueness', async () => {
    await useCase.execute({
      description: 'Some feature',
      repositoryPath: '/my/repo',
    });
    expect(mockRepo.findBySlug).toHaveBeenCalledWith('some-feature', '/my/repo');
  });

  it('should initialize with empty messages and artifacts', async () => {
    const result = await useCase.execute({
      description: 'New feature',
      repositoryPath: '/repo',
    });
    expect(result.messages).toEqual([]);
    expect(result.relatedArtifacts).toEqual([]);
  });

  it('should set createdAt and updatedAt timestamps', async () => {
    const before = new Date();
    const result = await useCase.execute({
      description: 'Timed feature',
      repositoryPath: '/repo',
    });
    const after = new Date();
    expect(result.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(result.createdAt.getTime()).toBeLessThanOrEqual(after.getTime());
    expect(result.updatedAt.getTime()).toEqual(result.createdAt.getTime());
  });
});
