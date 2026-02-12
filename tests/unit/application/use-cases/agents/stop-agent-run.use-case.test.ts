/**
 * StopAgentRunUseCase Unit Tests
 */

import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StopAgentRunUseCase } from '../../../../../src/application/use-cases/agents/stop-agent-run.use-case.js';
import { AgentRunStatus, AgentType } from '../../../../../src/domain/generated/output.js';
import type { IAgentRunRepository } from '../../../../../src/application/ports/output/agent-run-repository.interface.js';
import type { AgentRun } from '../../../../../src/domain/generated/output.js';

function makeAgentRun(overrides: Partial<AgentRun> = {}): AgentRun {
  const now = new Date().toISOString();
  return {
    id: 'run-123',
    agentType: AgentType.ClaudeCode,
    agentName: 'feature-agent',
    status: AgentRunStatus.running,
    prompt: 'test prompt',
    threadId: 'thread-1',
    pid: 99999,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe('StopAgentRunUseCase', () => {
  let useCase: StopAgentRunUseCase;
  let mockRepo: IAgentRunRepository;

  beforeEach(() => {
    mockRepo = {
      create: vi.fn().mockResolvedValue(undefined),
      findById: vi.fn().mockResolvedValue(null),
      findByThreadId: vi.fn().mockResolvedValue(null),
      updateStatus: vi.fn().mockResolvedValue(undefined),
      findRunningByPid: vi.fn().mockResolvedValue([]),
      list: vi.fn().mockResolvedValue([]),
      delete: vi.fn().mockResolvedValue(undefined),
    };

    useCase = new StopAgentRunUseCase(mockRepo);
  });

  it('should return error if run not found', async () => {
    vi.mocked(mockRepo.findById).mockResolvedValue(null);

    const result = await useCase.execute('nonexistent');

    expect(result.stopped).toBe(false);
    expect(result.reason).toContain('not found');
  });

  it('should return error if run is already in terminal state', async () => {
    vi.mocked(mockRepo.findById).mockResolvedValue(
      makeAgentRun({ status: AgentRunStatus.completed })
    );

    const result = await useCase.execute('run-123');

    expect(result.stopped).toBe(false);
    expect(result.reason).toContain('terminal state');
    expect(mockRepo.updateStatus).not.toHaveBeenCalled();
  });

  it('should cancel run with no PID', async () => {
    vi.mocked(mockRepo.findById).mockResolvedValue(
      makeAgentRun({ pid: undefined, status: AgentRunStatus.pending })
    );

    const result = await useCase.execute('run-123');

    expect(result.stopped).toBe(true);
    expect(mockRepo.updateStatus).toHaveBeenCalledWith(
      'run-123',
      AgentRunStatus.cancelled,
      expect.objectContaining({ error: expect.stringContaining('no PID') })
    );
  });

  it('should send SIGTERM to alive process and mark as cancelled', async () => {
    // Use our own PID which we know is alive
    vi.mocked(mockRepo.findById).mockResolvedValue(
      makeAgentRun({ pid: process.pid, status: AgentRunStatus.running })
    );
    // Spy on process.kill to prevent actually signaling ourselves
    const killSpy = vi.spyOn(process, 'kill').mockReturnValue(true);

    const result = await useCase.execute('run-123');

    expect(result.stopped).toBe(true);
    expect(result.reason).toContain('SIGTERM');
    // First call: kill(pid, 0) for liveness check, second: kill(pid, 'SIGTERM')
    expect(killSpy).toHaveBeenCalledWith(process.pid, 0);
    expect(killSpy).toHaveBeenCalledWith(process.pid, 'SIGTERM');
    expect(mockRepo.updateStatus).toHaveBeenCalledWith(
      'run-123',
      AgentRunStatus.cancelled,
      expect.objectContaining({ error: 'Cancelled by user' })
    );
  });

  it('should mark as cancelled even if process is already dead', async () => {
    vi.mocked(mockRepo.findById).mockResolvedValue(
      makeAgentRun({ pid: 1, status: AgentRunStatus.running })
    );
    vi.spyOn(process, 'kill').mockImplementation(() => {
      throw new Error('ESRCH');
    });

    const result = await useCase.execute('run-123');

    expect(result.stopped).toBe(true);
    expect(result.reason).toContain('already dead');
    expect(mockRepo.updateStatus).toHaveBeenCalledWith(
      'run-123',
      AgentRunStatus.cancelled,
      expect.anything()
    );
  });
});
