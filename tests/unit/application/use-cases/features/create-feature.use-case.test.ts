/**
 * CreateFeatureUseCase Unit Tests
 *
 * Tests for feature creation use case.
 * Uses mock repository, worktree service, agent process, and run repository.
 *
 * TDD Phase: RED-GREEN
 */

import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CreateFeatureUseCase } from '../../../../../src/application/use-cases/features/create-feature.use-case.js';
import type { IFeatureRepository } from '../../../../../src/application/ports/output/feature-repository.interface.js';
import type { IWorktreeService } from '../../../../../src/application/ports/output/worktree-service.interface.js';
import type { IFeatureAgentProcessService } from '../../../../../src/application/ports/output/feature-agent-process.interface.js';
import type { IAgentRunRepository } from '../../../../../src/application/ports/output/agent-run-repository.interface.js';
import { SdlcLifecycle } from '../../../../../src/domain/generated/output.js';

// Mock settings service
vi.mock('../../../../../src/infrastructure/services/settings.service.js', () => ({
  getSettings: () => ({
    agent: { type: 'claude-code', authMethod: 'token', token: 'test' },
  }),
}));

describe('CreateFeatureUseCase', () => {
  let useCase: CreateFeatureUseCase;
  let mockRepo: IFeatureRepository;
  let mockWorktree: IWorktreeService;
  let mockAgentProcess: IFeatureAgentProcessService;
  let mockRunRepo: IAgentRunRepository;

  beforeEach(() => {
    mockRepo = {
      create: vi.fn().mockResolvedValue(undefined),
      findById: vi.fn().mockResolvedValue(null),
      findByIdPrefix: vi.fn().mockResolvedValue(null),
      findBySlug: vi.fn().mockResolvedValue(null),
      list: vi.fn().mockResolvedValue([]),
      update: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
    };
    mockWorktree = {
      create: vi.fn().mockResolvedValue({
        path: '/home/user/.shep/repos/abc123/wt/feat-test',
        head: 'abc',
        branch: 'feat/test',
        isMain: false,
      }),
      remove: vi.fn().mockResolvedValue(undefined),
      list: vi.fn().mockResolvedValue([]),
      exists: vi.fn().mockResolvedValue(false),
      getWorktreePath: vi.fn().mockReturnValue('/home/user/.shep/repos/abc123/wt/feat-test'),
    };
    mockAgentProcess = {
      spawn: vi.fn().mockReturnValue(12345),
      isAlive: vi.fn().mockReturnValue(true),
      checkAndMarkCrashed: vi.fn().mockResolvedValue(undefined),
    };
    mockRunRepo = {
      create: vi.fn().mockResolvedValue(undefined),
      findById: vi.fn().mockResolvedValue(null),
      findByThreadId: vi.fn().mockResolvedValue(null),
      updateStatus: vi.fn().mockResolvedValue(undefined),
      findRunningByPid: vi.fn().mockResolvedValue([]),
      list: vi.fn().mockResolvedValue([]),
      delete: vi.fn().mockResolvedValue(undefined),
    };
    useCase = new CreateFeatureUseCase(mockRepo, mockWorktree, mockAgentProcess, mockRunRepo);
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

  it('should spawn the feature agent process', async () => {
    const result = await useCase.execute({
      description: 'Add user auth',
      repositoryPath: '/home/user/project',
    });
    expect(mockAgentProcess.spawn).toHaveBeenCalledOnce();
    expect(result.agentRunId).toBeDefined();
  });

  it('should create an agent run record before spawning', async () => {
    await useCase.execute({
      description: 'Add user auth',
      repositoryPath: '/home/user/project',
    });
    expect(mockRunRepo.create).toHaveBeenCalledOnce();
    expect(mockRunRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        agentName: 'feature-agent',
      })
    );
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
