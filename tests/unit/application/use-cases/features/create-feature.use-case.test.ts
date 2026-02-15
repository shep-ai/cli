/**
 * CreateFeatureUseCase Unit Tests
 *
 * Tests for feature creation use case.
 * Uses mock repository, worktree service, agent process, run repository,
 * spec initializer, and agent executor provider.
 *
 * TDD Phase: RED-GREEN
 */

import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CreateFeatureUseCase } from '../../../../../src/application/use-cases/features/create-feature.use-case.js';
import type { IFeatureRepository } from '../../../../../src/application/ports/output/repositories/feature-repository.interface.js';
import type { IWorktreeService } from '../../../../../src/application/ports/output/services/worktree-service.interface.js';
import type { IFeatureAgentProcessService } from '../../../../../src/application/ports/output/agents/feature-agent-process.interface.js';
import type { IAgentRunRepository } from '../../../../../src/application/ports/output/agents/agent-run-repository.interface.js';
import type { ISpecInitializerService } from '../../../../../src/application/ports/output/services/spec-initializer.interface.js';
import type { IAgentExecutorProvider } from '../../../../../src/application/ports/output/agents/agent-executor-provider.interface.js';
import type { IAgentExecutor } from '../../../../../src/application/ports/output/agents/agent-executor.interface.js';
import { SdlcLifecycle } from '../../../../../src/domain/generated/output.js';

// Mock settings service
vi.mock('../../../../../src/infrastructure/services/settings.service.js', () => ({
  getSettings: () => ({
    agent: { type: 'claude-code', authMethod: 'token', token: 'test' },
  }),
}));

function createMockExecutor(response: string): IAgentExecutor {
  return {
    agentType: 'claude-code' as never,
    execute: vi.fn().mockResolvedValue({ result: response }),
    executeStream: vi.fn(),
    supportsFeature: vi.fn().mockReturnValue(false),
  };
}

describe('CreateFeatureUseCase', () => {
  let useCase: CreateFeatureUseCase;
  let mockRepo: IFeatureRepository;
  let mockWorktree: IWorktreeService;
  let mockAgentProcess: IFeatureAgentProcessService;
  let mockRunRepo: IAgentRunRepository;
  let mockSpecInitializer: ISpecInitializerService;
  let mockExecutorProvider: IAgentExecutorProvider;
  let mockExecutor: IAgentExecutor;

  const WORKTREE_PATH = '/home/user/.shep/repos/abc123/wt/feat-test';
  const SPEC_DIR = '/home/user/.shep/repos/abc123/wt/feat-test/specs/001-add-user-auth';

  const AI_RESPONSE = JSON.stringify({
    slug: 'user-auth',
    name: 'User Authentication',
    description: 'Add user authentication with session management',
  });

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
        path: WORKTREE_PATH,
        head: 'abc',
        branch: 'feat/test',
        isMain: false,
      }),
      remove: vi.fn().mockResolvedValue(undefined),
      list: vi.fn().mockResolvedValue([]),
      exists: vi.fn().mockResolvedValue(false),
      getWorktreePath: vi.fn().mockReturnValue(WORKTREE_PATH),
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
    mockSpecInitializer = {
      initialize: vi.fn().mockResolvedValue({ specDir: SPEC_DIR, featureNumber: '001' }),
    };
    mockExecutor = createMockExecutor(AI_RESPONSE);
    mockExecutorProvider = {
      getExecutor: vi.fn().mockReturnValue(mockExecutor),
    };
    useCase = new CreateFeatureUseCase(
      mockRepo,
      mockWorktree,
      mockAgentProcess,
      mockRunRepo,
      mockSpecInitializer,
      mockExecutorProvider
    );
  });

  // ── AI Metadata Generation ──────────────────────────────────────────

  it('should call AI to generate slug, name, and description from user input', async () => {
    const { feature } = await useCase.execute({
      userInput: 'I want users to log in with their GitHub accounts using OAuth',
      repositoryPath: '/repo',
    });

    expect(mockExecutorProvider.getExecutor).toHaveBeenCalledOnce();
    expect(mockExecutor.execute).toHaveBeenCalledOnce();
    expect(feature.slug).toBe('user-auth');
    expect(feature.name).toBe('User Authentication');
    expect(feature.description).toBe('Add user authentication with session management');
  });

  it('should truncate long user input in the AI prompt', async () => {
    const longInput = 'A'.repeat(2000);

    await useCase.execute({
      userInput: longInput,
      repositoryPath: '/repo',
    });

    const prompt = (mockExecutor.execute as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    // The prompt should NOT contain the full 2000 chars
    expect(prompt.length).toBeLessThan(longInput.length);
  });

  it('should pass full untruncated user input to spec initializer', async () => {
    const longInput = 'A'.repeat(2000);

    await useCase.execute({
      userInput: longInput,
      repositoryPath: '/repo',
    });

    // 4th arg to initialize is the description — must be the full user input
    const initCall = (mockSpecInitializer.initialize as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(initCall[3]).toBe(longInput);
  });

  it('should pass full user input as agent run prompt', async () => {
    const longInput = 'I want a very detailed feature that does many things...';

    await useCase.execute({
      userInput: longInput,
      repositoryPath: '/repo',
    });

    expect(mockRunRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: longInput,
      })
    );
  });

  it('should fall back to regex slug when AI returns invalid JSON', async () => {
    mockExecutor = createMockExecutor('not valid json at all');
    mockExecutorProvider = {
      getExecutor: vi.fn().mockReturnValue(mockExecutor),
    };
    useCase = new CreateFeatureUseCase(
      mockRepo,
      mockWorktree,
      mockAgentProcess,
      mockRunRepo,
      mockSpecInitializer,
      mockExecutorProvider
    );

    const { feature } = await useCase.execute({
      userInput: 'Add user authentication',
      repositoryPath: '/repo',
    });

    expect(feature.slug).toBe('add-user-authentication');
    expect(feature.name).toBe('Add user authentication');
    expect(feature.description).toBe('Add user authentication');
  });

  it('should fall back to regex slug when AI executor throws', async () => {
    mockExecutor = {
      agentType: 'claude-code' as never,
      execute: vi.fn().mockRejectedValue(new Error('network error')),
      executeStream: vi.fn(),
      supportsFeature: vi.fn().mockReturnValue(false),
    };
    mockExecutorProvider = {
      getExecutor: vi.fn().mockReturnValue(mockExecutor),
    };
    useCase = new CreateFeatureUseCase(
      mockRepo,
      mockWorktree,
      mockAgentProcess,
      mockRunRepo,
      mockSpecInitializer,
      mockExecutorProvider
    );

    const { feature } = await useCase.execute({
      userInput: 'Fix bug #123',
      repositoryPath: '/repo',
    });

    expect(feature.slug).toMatch(/^[a-z0-9-]+$/);
  });

  it('should sanitize AI-generated slug with invalid characters', async () => {
    mockExecutor = createMockExecutor(
      JSON.stringify({
        slug: 'INVALID Slug!@#',
        name: 'Some Feature',
        description: 'Some desc',
      })
    );
    mockExecutorProvider = {
      getExecutor: vi.fn().mockReturnValue(mockExecutor),
    };
    useCase = new CreateFeatureUseCase(
      mockRepo,
      mockWorktree,
      mockAgentProcess,
      mockRunRepo,
      mockSpecInitializer,
      mockExecutorProvider
    );

    const { feature } = await useCase.execute({
      userInput: 'Some feature',
      repositoryPath: '/repo',
    });

    expect(feature.slug).toMatch(/^[a-z0-9-]+$/);
  });

  // ── Existing behavior (updated to use userInput) ───────────────────

  it('should use AI-generated metadata for the feature record', async () => {
    const { feature } = await useCase.execute({
      userInput: 'Add user authentication',
      repositoryPath: '/home/user/project',
    });
    expect(feature.slug).toBe('user-auth');
    expect(feature.name).toBe('User Authentication');
    expect(feature.lifecycle).toBe(SdlcLifecycle.Requirements);
    expect(mockRepo.create).toHaveBeenCalledOnce();
  });

  it('should create a git worktree', async () => {
    await useCase.execute({
      userInput: 'Add user auth',
      repositoryPath: '/home/user/project',
    });
    expect(mockWorktree.create).toHaveBeenCalledOnce();
  });

  it('should spawn the feature agent process', async () => {
    const { feature } = await useCase.execute({
      userInput: 'Add user auth',
      repositoryPath: '/home/user/project',
    });
    expect(mockAgentProcess.spawn).toHaveBeenCalledOnce();
    expect(feature.agentRunId).toBeDefined();
  });

  it('should create an agent run record before spawning', async () => {
    await useCase.execute({
      userInput: 'Add user auth',
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
    const { feature } = await useCase.execute({
      userInput: 'Test feature',
      repositoryPath: '/repo',
    });
    expect(feature.id).toBeDefined();
    expect(feature.id.length).toBeGreaterThan(0);
  });

  it('should set branch to feat/<slug>', async () => {
    const { feature } = await useCase.execute({
      userInput: 'Add logging',
      repositoryPath: '/repo',
    });
    // AI returns 'user-auth' slug (same mock for all tests)
    expect(feature.branch).toBe('feat/user-auth');
  });

  it('should pass repositoryPath when checking slug uniqueness', async () => {
    await useCase.execute({
      userInput: 'Some feature',
      repositoryPath: '/my/repo',
    });
    expect(mockRepo.findBySlug).toHaveBeenCalledWith('user-auth', '/my/repo');
  });

  it('should initialize with empty messages and artifacts', async () => {
    const { feature } = await useCase.execute({
      userInput: 'New feature',
      repositoryPath: '/repo',
    });
    expect(feature.messages).toEqual([]);
    expect(feature.relatedArtifacts).toEqual([]);
  });

  it('should pass approvalGates and threadId to agent process spawn', async () => {
    const gates = { allowPrd: false, allowPlan: false };
    await useCase.execute({
      userInput: 'Add feature',
      repositoryPath: '/repo',
      approvalGates: gates,
    });
    expect(mockAgentProcess.spawn).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      '/repo',
      expect.any(String),
      expect.any(String),
      expect.objectContaining({
        approvalGates: gates,
        threadId: expect.any(String),
      })
    );
  });

  it('should store featureId and repositoryPath on agent run', async () => {
    const { feature } = await useCase.execute({
      userInput: 'Add feature',
      repositoryPath: '/repo',
    });
    expect(mockRunRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        featureId: feature.id,
        repositoryPath: '/repo',
      })
    );
  });

  it('should set createdAt and updatedAt timestamps', async () => {
    const before = new Date();
    const { feature } = await useCase.execute({
      userInput: 'Timed feature',
      repositoryPath: '/repo',
    });
    const after = new Date();
    expect(feature.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(feature.createdAt.getTime()).toBeLessThanOrEqual(after.getTime());
    expect(feature.updatedAt.getTime()).toEqual(feature.createdAt.getTime());
  });

  it('should pass full user input as description to spec initializer', async () => {
    await useCase.execute({
      userInput: 'Add user auth',
      repositoryPath: '/repo',
    });
    expect(mockSpecInitializer.initialize).toHaveBeenCalledOnce();
    // slug comes from AI, but description is the full user input
    expect(mockSpecInitializer.initialize).toHaveBeenCalledWith(
      WORKTREE_PATH,
      'user-auth',
      1, // first feature in repo
      'Add user auth'
    );
  });

  it('should persist specPath on the feature record', async () => {
    const { feature } = await useCase.execute({
      userInput: 'Add user auth',
      repositoryPath: '/repo',
    });
    expect(feature.specPath).toBe(SPEC_DIR);
    expect(mockRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        specPath: SPEC_DIR,
      })
    );
  });

  it('should pass specDir (not worktreePath) to agent spawn', async () => {
    await useCase.execute({
      userInput: 'Add user auth',
      repositoryPath: '/repo',
    });
    expect(mockAgentProcess.spawn).toHaveBeenCalledWith(
      expect.any(String), // featureId
      expect.any(String), // runId
      '/repo', // repoPath
      SPEC_DIR, // specDir
      WORKTREE_PATH, // worktreePath
      expect.objectContaining({ threadId: expect.any(String) })
    );
  });

  it('should compute feature number from existing features count', async () => {
    mockRepo.list = vi.fn().mockResolvedValue([{ id: '1' }, { id: '2' }, { id: '3' }]);
    await useCase.execute({
      userInput: 'Fourth feature',
      repositoryPath: '/repo',
    });
    expect(mockSpecInitializer.initialize).toHaveBeenCalledWith(
      WORKTREE_PATH,
      'user-auth',
      4, // 3 existing + 1
      'Fourth feature'
    );
  });

  // ── Slug auto-suffixing on branch conflict ─────────────────────────

  it('should auto-suffix slug when feature with same slug exists in DB', async () => {
    // First call (user-auth) → exists, second call (user-auth-2) → null
    mockRepo.findBySlug = vi
      .fn()
      .mockResolvedValueOnce({ id: 'existing' })
      .mockResolvedValueOnce(null);

    const { feature, warning } = await useCase.execute({
      userInput: 'Add user auth',
      repositoryPath: '/repo',
    });

    expect(feature.slug).toBe('user-auth-2');
    expect(feature.branch).toBe('feat/user-auth-2');
    expect(warning).toContain('feat/user-auth');
    expect(warning).toContain('feat/user-auth-2');
  });

  it('should auto-suffix slug when git branch already exists', async () => {
    // Branch exists for original slug, not for suffixed one
    mockWorktree.exists = vi.fn().mockResolvedValueOnce(true).mockResolvedValueOnce(false);

    const { feature, warning } = await useCase.execute({
      userInput: 'Add user auth',
      repositoryPath: '/repo',
    });

    expect(feature.slug).toBe('user-auth-2');
    expect(feature.branch).toBe('feat/user-auth-2');
    expect(warning).toContain('already exists');
  });

  it('should not include warning when no conflict', async () => {
    const { warning } = await useCase.execute({
      userInput: 'Add user auth',
      repositoryPath: '/repo',
    });

    expect(warning).toBeUndefined();
  });

  it('should throw after max suffix attempts when all slugs conflict', async () => {
    mockRepo.findBySlug = vi.fn().mockResolvedValue({ id: 'existing' });

    await expect(
      useCase.execute({
        userInput: 'Existing feature',
        repositoryPath: '/repo',
      })
    ).rejects.toThrow(/unique slug/);
  });
});
