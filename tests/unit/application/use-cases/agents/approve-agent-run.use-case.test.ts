/**
 * Approve Agent Run Use Case Unit Tests
 *
 * Tests for approving a paused agent run (human-in-the-loop).
 *
 * TDD Phase: RED
 */

import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AgentRunStatus } from '@/domain/generated/output.js';
import type { AgentRun } from '@/domain/generated/output.js';
import { ApproveAgentRunUseCase } from '@/application/use-cases/agents/approve-agent-run.use-case.js';

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
    findBySlug: vi.fn(),
    list: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };
}

function createMockWorktreeService() {
  return {
    create: vi.fn(),
    remove: vi.fn(),
    getWorktreePath: vi.fn().mockReturnValue('/test/repo/.shep/wt/feat-branch'),
    exists: vi.fn(),
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

describe('ApproveAgentRunUseCase', () => {
  let useCase: ApproveAgentRunUseCase;
  let mockRunRepo: ReturnType<typeof createMockRunRepository>;
  let mockProcessService: ReturnType<typeof createMockProcessService>;
  let mockFeatureRepo: ReturnType<typeof createMockFeatureRepository>;
  let mockWorktreeService: ReturnType<typeof createMockWorktreeService>;

  beforeEach(() => {
    mockRunRepo = createMockRunRepository();
    mockProcessService = createMockProcessService();
    mockFeatureRepo = createMockFeatureRepository();
    mockWorktreeService = createMockWorktreeService();
    mockFeatureRepo.findById.mockResolvedValue({
      id: 'feat-001',
      branch: 'feat/test-feature',
      repositoryPath: '/test/repo',
    });
    useCase = new ApproveAgentRunUseCase(
      mockRunRepo as any,
      mockProcessService as any,
      mockFeatureRepo as any,
      mockWorktreeService as any
    );
  });

  it('should approve a waiting agent run and spawn a resume worker', async () => {
    mockRunRepo.findById.mockResolvedValue(createWaitingRun());

    const result = await useCase.execute('run-001');

    expect(result.approved).toBe(true);
    expect(mockRunRepo.updateStatus).toHaveBeenCalledWith(
      'run-001',
      AgentRunStatus.running,
      expect.objectContaining({
        updatedAt: expect.any(Date),
      })
    );
    expect(mockWorktreeService.getWorktreePath).toHaveBeenCalledWith(
      '/test/repo',
      'feat/test-feature'
    );
    const wt = '/test/repo/.shep/wt/feat-branch';
    expect(mockProcessService.spawn).toHaveBeenCalledWith(
      'feat-001',
      'run-001',
      '/test/repo',
      wt,
      wt,
      expect.objectContaining({
        resume: true,
        threadId: 'thread-001',
        resumeFromInterrupt: true,
        approvalGates: { allowPrd: false, allowPlan: false, allowMerge: false },
      })
    );
  });

  it('should return error when run not found', async () => {
    mockRunRepo.findById.mockResolvedValue(null);

    const result = await useCase.execute('non-existent');

    expect(result.approved).toBe(false);
    expect(result.reason).toContain('not found');
  });

  it('should return error when run is not in waiting_approval status', async () => {
    mockRunRepo.findById.mockResolvedValue(createWaitingRun({ status: AgentRunStatus.running }));

    const result = await useCase.execute('run-001');

    expect(result.approved).toBe(false);
    expect(result.reason).toContain('not waiting');
  });
});
