/**
 * GetExecutionHistory Use Case Tests
 *
 * TDD Phase: RED → GREEN → REFACTOR
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GetExecutionHistoryUseCase } from '@/application/use-cases/agents/get-execution-history.use-case.js';
import { ExecutionStepStatus, ExecutionStepType } from '@/domain/generated/output.js';
import type { ExecutionStep } from '@/domain/generated/output.js';
import type { IExecutionStepRepository } from '@/application/ports/output/agents/execution-step-repository.interface.js';

function createMockRepo(): IExecutionStepRepository {
  return {
    save: vi.fn().mockResolvedValue(undefined),
    update: vi.fn().mockResolvedValue(undefined),
    findByRunId: vi.fn().mockResolvedValue([]),
    findByFeatureId: vi.fn().mockResolvedValue([]),
    getNextSequenceNumber: vi.fn().mockResolvedValue(0),
  };
}

function makeStep(overrides: Partial<ExecutionStep> = {}): ExecutionStep {
  const now = new Date();
  return {
    id: `step-${Math.random().toString(36).slice(2, 8)}`,
    agentRunId: 'run-001',
    name: 'test',
    type: ExecutionStepType.phase,
    status: ExecutionStepStatus.completed,
    startedAt: now,
    completedAt: new Date(now.getTime() + 5000),
    durationMs: BigInt(5000),
    sequenceNumber: 0,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe('GetExecutionHistoryUseCase', () => {
  let useCase: GetExecutionHistoryUseCase;
  let mockRepo: IExecutionStepRepository;

  beforeEach(() => {
    mockRepo = createMockRepo();
    useCase = new GetExecutionHistoryUseCase(mockRepo);
  });

  describe('tree assembly from flat rows', () => {
    it('should assemble parent-child tree from flat steps', async () => {
      const parent = makeStep({
        id: 'parent-1',
        name: 'merge',
        sequenceNumber: 0,
        durationMs: BigInt(10000),
      });
      const child1 = makeStep({
        id: 'child-1',
        name: 'commit',
        parentId: 'parent-1',
        type: ExecutionStepType.subStep,
        sequenceNumber: 0,
        durationMs: BigInt(2000),
      });
      const child2 = makeStep({
        id: 'child-2',
        name: 'push',
        parentId: 'parent-1',
        type: ExecutionStepType.subStep,
        sequenceNumber: 1,
        durationMs: BigInt(3000),
      });

      vi.mocked(mockRepo.findByRunId).mockResolvedValue([parent, child1, child2]);

      const result = await useCase.execute({ agentRunId: 'run-001' });

      expect(result.steps).toHaveLength(1);
      expect(result.steps[0].name).toBe('merge');
      expect(result.steps[0].children).toHaveLength(2);
      expect(result.steps[0].children[0].name).toBe('commit');
      expect(result.steps[0].children[1].name).toBe('push');
    });

    it('should handle 2 levels of nesting', async () => {
      const root = makeStep({ id: 'r', name: 'merge', sequenceNumber: 0 });
      const mid = makeStep({
        id: 'm',
        name: 'watch-ci',
        parentId: 'r',
        type: ExecutionStepType.subStep,
        sequenceNumber: 0,
      });
      const leaf = makeStep({
        id: 'l',
        name: 'fix-attempt-1',
        parentId: 'm',
        type: ExecutionStepType.subStep,
        sequenceNumber: 0,
      });

      vi.mocked(mockRepo.findByRunId).mockResolvedValue([root, mid, leaf]);

      const result = await useCase.execute({ agentRunId: 'run-001' });

      expect(result.steps[0].children[0].children).toHaveLength(1);
      expect(result.steps[0].children[0].children[0].name).toBe('fix-attempt-1');
    });
  });

  describe('total computation', () => {
    it('should compute totalDurationMs from root completed steps', async () => {
      const s1 = makeStep({
        id: 's1',
        name: 'analyze',
        sequenceNumber: 0,
        durationMs: BigInt(5000),
      });
      const s2 = makeStep({
        id: 's2',
        name: 'requirements',
        sequenceNumber: 1,
        durationMs: BigInt(8000),
      });

      vi.mocked(mockRepo.findByRunId).mockResolvedValue([s1, s2]);

      const result = await useCase.execute({ agentRunId: 'run-001' });

      expect(result.totalDurationMs).toBe(13000);
    });

    it('should compute totalWaitMs from approvalWait type steps', async () => {
      const phase = makeStep({
        id: 'p1',
        name: 'requirements',
        sequenceNumber: 0,
        durationMs: BigInt(10000),
      });
      const wait = makeStep({
        id: 'w1',
        name: 'approval',
        parentId: 'p1',
        type: ExecutionStepType.approvalWait,
        sequenceNumber: 0,
        durationMs: BigInt(5000),
      });

      vi.mocked(mockRepo.findByRunId).mockResolvedValue([phase, wait]);

      const result = await useCase.execute({ agentRunId: 'run-001' });

      expect(result.totalWaitMs).toBe(5000);
    });

    it('should handle running steps with elapsed time', async () => {
      const startTime = new Date(Date.now() - 3000);
      const running = makeStep({
        id: 'r1',
        name: 'implement',
        sequenceNumber: 0,
        status: ExecutionStepStatus.running,
        startedAt: startTime,
        completedAt: undefined,
        durationMs: undefined,
      });

      vi.mocked(mockRepo.findByRunId).mockResolvedValue([running]);

      const result = await useCase.execute({ agentRunId: 'run-001' });

      expect(result.steps[0].durationMs).toBeGreaterThanOrEqual(3000);
      expect(result.steps[0].status).toBe(ExecutionStepStatus.running);
    });
  });

  describe('empty history', () => {
    it('should return empty DTO for no steps', async () => {
      vi.mocked(mockRepo.findByRunId).mockResolvedValue([]);

      const result = await useCase.execute({ agentRunId: 'run-001' });

      expect(result.steps).toEqual([]);
      expect(result.totalDurationMs).toBe(0);
      expect(result.totalWaitMs).toBe(0);
      expect(result.agentRunId).toBe('run-001');
    });
  });

  describe('ordering', () => {
    it('should order children by sequenceNumber within siblings', async () => {
      const parent = makeStep({ id: 'p', name: 'merge', sequenceNumber: 0 });
      // Insert in reverse order
      const c3 = makeStep({
        id: 'c3',
        name: 'pr',
        parentId: 'p',
        type: ExecutionStepType.subStep,
        sequenceNumber: 2,
      });
      const c1 = makeStep({
        id: 'c1',
        name: 'commit',
        parentId: 'p',
        type: ExecutionStepType.subStep,
        sequenceNumber: 0,
      });
      const c2 = makeStep({
        id: 'c2',
        name: 'push',
        parentId: 'p',
        type: ExecutionStepType.subStep,
        sequenceNumber: 1,
      });

      vi.mocked(mockRepo.findByRunId).mockResolvedValue([parent, c3, c1, c2]);

      const result = await useCase.execute({ agentRunId: 'run-001' });

      expect(result.steps[0].children.map((c) => c.name)).toEqual(['commit', 'push', 'pr']);
    });
  });

  describe('featureId lookup', () => {
    it('should use findByFeatureId when featureId provided', async () => {
      vi.mocked(mockRepo.findByFeatureId).mockResolvedValue([]);

      await useCase.execute({ featureId: 'feat-001' });

      expect(mockRepo.findByFeatureId).toHaveBeenCalledWith('feat-001');
      expect(mockRepo.findByRunId).not.toHaveBeenCalled();
    });
  });

  describe('metadata parsing', () => {
    it('should parse metadata JSON string into object', async () => {
      const step = makeStep({
        id: 's1',
        name: 'approval',
        sequenceNumber: 0,
        metadata: JSON.stringify({ input: 'looks good', output: 'approved' }),
      });

      vi.mocked(mockRepo.findByRunId).mockResolvedValue([step]);

      const result = await useCase.execute({ agentRunId: 'run-001' });

      expect(result.steps[0].metadata).toEqual({
        input: 'looks good',
        output: 'approved',
      });
    });
  });
});
