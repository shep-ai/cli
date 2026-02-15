/**
 * Reject Agent Run Use Case Unit Tests
 *
 * Tests for rejecting a paused agent run (human-in-the-loop).
 *
 * TDD Phase: RED
 */

import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AgentRunStatus } from '../../../../../src/domain/generated/output.js';
import type { AgentRun } from '../../../../../src/domain/generated/output.js';
import { RejectAgentRunUseCase } from '../../../../../src/application/use-cases/agents/reject-agent-run.use-case.js';

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
    approvalGates: { allowPrd: false, allowPlan: false },
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('RejectAgentRunUseCase', () => {
  let useCase: RejectAgentRunUseCase;
  let mockRunRepo: ReturnType<typeof createMockRunRepository>;

  beforeEach(() => {
    mockRunRepo = createMockRunRepository();
    useCase = new RejectAgentRunUseCase(mockRunRepo as any);
  });

  it('should reject a waiting agent run and mark as cancelled', async () => {
    mockRunRepo.findById.mockResolvedValue(createWaitingRun());

    const result = await useCase.execute('run-001', 'User rejected the plan');

    expect(result.rejected).toBe(true);
    expect(mockRunRepo.updateStatus).toHaveBeenCalledWith(
      'run-001',
      AgentRunStatus.cancelled,
      expect.objectContaining({
        error: 'User rejected the plan',
      })
    );
  });

  it('should return error when run not found', async () => {
    mockRunRepo.findById.mockResolvedValue(null);

    const result = await useCase.execute('non-existent');

    expect(result.rejected).toBe(false);
    expect(result.reason).toContain('not found');
  });

  it('should return error when run is not in waiting_approval status', async () => {
    mockRunRepo.findById.mockResolvedValue(createWaitingRun({ status: AgentRunStatus.completed }));

    const result = await useCase.execute('run-001');

    expect(result.rejected).toBe(false);
    expect(result.reason).toContain('not waiting');
  });

  it('should use default reason when none provided', async () => {
    mockRunRepo.findById.mockResolvedValue(createWaitingRun());

    const result = await useCase.execute('run-001');

    expect(result.rejected).toBe(true);
    expect(mockRunRepo.updateStatus).toHaveBeenCalledWith(
      'run-001',
      AgentRunStatus.cancelled,
      expect.objectContaining({
        error: expect.stringContaining('Rejected'),
      })
    );
  });
});
