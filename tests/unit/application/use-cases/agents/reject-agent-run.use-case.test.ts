/**
 * Reject Agent Run Use Case Unit Tests
 *
 * Tests for rejecting a paused agent run (human-in-the-loop).
 * Tests the basic validation paths (not found, wrong status, empty feedback).
 * See reject-agent-run-iteration.test.ts for iteration-specific tests.
 */

import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AgentRunStatus } from '@/domain/generated/output.js';
import type { AgentRun } from '@/domain/generated/output.js';
import { RejectAgentRunUseCase } from '@/application/use-cases/agents/reject-agent-run.use-case.js';

// Mock fs, js-yaml, and writeSpecFileAtomic
vi.mock('node:fs', () => ({
  readFileSync: vi.fn().mockReturnValue('{}'),
}));

vi.mock('js-yaml', () => ({
  default: {
    load: vi.fn().mockReturnValue({ openQuestions: [] }),
    dump: vi.fn().mockReturnValue('yaml'),
  },
}));

vi.mock('@/infrastructure/services/agents/feature-agent/nodes/node-helpers.js', () => ({
  writeSpecFileAtomic: vi.fn(),
}));

vi.mock('@/infrastructure/services/ide-launchers/compute-worktree-path.js', () => ({
  computeWorktreePath: vi.fn().mockReturnValue('/computed/worktree/path'),
}));

function createMockRunRepository() {
  return {
    create: vi.fn(),
    findById: vi.fn(),
    findByThreadId: vi.fn(),
    updateStatus: vi.fn(),
    findRunningByPid: vi.fn(),
    list: vi.fn(),
    delete: vi.fn(),
  };
}

function createMockProcessService() {
  return {
    spawn: vi.fn().mockReturnValue(12345),
    isAlive: vi.fn().mockReturnValue(true),
    checkAndMarkCrashed: vi.fn(),
  };
}

function createMockFeatureRepository() {
  return {
    create: vi.fn(),
    findById: vi.fn(),
    findByIdPrefix: vi.fn(),
    findBySlug: vi.fn(),
    list: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };
}

function createMockTimingRepository() {
  return {
    save: vi.fn(),
    update: vi.fn(),
    updateApprovalWait: vi.fn(),
    findByRunId: vi.fn().mockResolvedValue([]),
    findByFeatureId: vi.fn(),
  };
}

function createWaitingRun(overrides?: Partial<AgentRun>): AgentRun {
  return {
    id: 'run-001',
    agentType: 'claude-code' as any,
    agentName: 'feature-agent',
    status: AgentRunStatus.waitingApproval,
    prompt: 'Test prompt',
    threadId: 'thread-001',
    featureId: 'feat-001',
    repositoryPath: '/test/repo',
    approvalGates: { allowPrd: false, allowPlan: false, allowMerge: false },
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('RejectAgentRunUseCase', () => {
  let useCase: RejectAgentRunUseCase;
  let mockRunRepo: ReturnType<typeof createMockRunRepository>;
  let mockProcessService: ReturnType<typeof createMockProcessService>;
  let mockFeatureRepo: ReturnType<typeof createMockFeatureRepository>;
  let mockTimingRepo: ReturnType<typeof createMockTimingRepository>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRunRepo = createMockRunRepository();
    mockProcessService = createMockProcessService();
    mockFeatureRepo = createMockFeatureRepository();
    mockTimingRepo = createMockTimingRepository();
    mockFeatureRepo.findById.mockResolvedValue({
      id: 'feat-001',
      name: 'test-feature',
      slug: 'test-feature',
      branch: 'feat/test-feature',
      repositoryPath: '/test/repo',
      push: false,
      openPr: false,
      specPath: '/test/repo/.shep/wt/feat-branch',
    });
    useCase = new RejectAgentRunUseCase(
      mockRunRepo as any,
      mockProcessService as any,
      mockFeatureRepo as any,
      mockTimingRepo as any
    );
  });

  it('should reject a waiting agent run and iterate', async () => {
    mockRunRepo.findById.mockResolvedValue(createWaitingRun());

    const result = await useCase.execute('run-001', 'User rejected the plan');

    expect(result.rejected).toBe(true);
    expect(mockRunRepo.updateStatus).toHaveBeenCalledWith(
      'run-001',
      AgentRunStatus.running,
      expect.objectContaining({
        updatedAt: expect.any(Date),
      })
    );
  });

  it('should return error when run not found', async () => {
    mockRunRepo.findById.mockResolvedValue(null);

    const result = await useCase.execute('non-existent', 'feedback');

    expect(result.rejected).toBe(false);
    expect(result.reason).toContain('not found');
  });

  it('should return error when run is not in waiting_approval status', async () => {
    mockRunRepo.findById.mockResolvedValue(createWaitingRun({ status: AgentRunStatus.completed }));

    const result = await useCase.execute('run-001', 'feedback');

    expect(result.rejected).toBe(false);
    expect(result.reason).toContain('not waiting');
  });

  it('should return error when feedback is empty', async () => {
    mockRunRepo.findById.mockResolvedValue(createWaitingRun());

    const result = await useCase.execute('run-001', '');

    expect(result.rejected).toBe(false);
    expect(result.reason).toContain('Feedback is required');
  });

  it('should compute worktree path when feature.worktreePath is undefined', async () => {
    mockRunRepo.findById.mockResolvedValue(createWaitingRun());
    mockFeatureRepo.findById.mockResolvedValue({
      id: 'feat-001',
      name: 'test-feature',
      slug: 'test-feature',
      branch: 'feat/test-feature',
      repositoryPath: '/test/repo',
      push: false,
      openPr: false,
      specPath: '/test/specs',
      // worktreePath is intentionally undefined
    });

    await useCase.execute('run-001', 'fix this');

    // Should pass computed path as 5th argument to spawn
    expect(mockProcessService.spawn).toHaveBeenCalledWith(
      'feat-001',
      'run-001',
      '/test/repo',
      '/test/specs',
      '/computed/worktree/path',
      expect.any(Object)
    );
  });

  it('should use feature.worktreePath when available', async () => {
    mockRunRepo.findById.mockResolvedValue(createWaitingRun());
    mockFeatureRepo.findById.mockResolvedValue({
      id: 'feat-001',
      name: 'test-feature',
      slug: 'test-feature',
      branch: 'feat/test-feature',
      repositoryPath: '/test/repo',
      push: false,
      openPr: false,
      specPath: '/test/specs',
      worktreePath: '/existing/worktree',
    });

    await useCase.execute('run-001', 'fix this');

    // Should use existing worktreePath, not computed one
    expect(mockProcessService.spawn).toHaveBeenCalledWith(
      'feat-001',
      'run-001',
      '/test/repo',
      '/test/specs',
      '/existing/worktree',
      expect.any(Object)
    );
  });
});
