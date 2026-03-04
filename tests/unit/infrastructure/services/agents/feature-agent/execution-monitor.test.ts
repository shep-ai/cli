/**
 * ExecutionMonitor Tests
 *
 * TDD Phase: RED → GREEN → REFACTOR
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ExecutionMonitor } from '@/infrastructure/services/agents/feature-agent/execution-monitor.js';
import { ExecutionStepStatus, ExecutionStepType } from '@/domain/generated/output.js';
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

describe('ExecutionMonitor', () => {
  let monitor: ExecutionMonitor;
  let mockRepo: IExecutionStepRepository;

  beforeEach(() => {
    mockRepo = createMockRepo();
    monitor = new ExecutionMonitor('run-001', mockRepo);
  });

  describe('startStep', () => {
    it('should create a step with status=running and return step ID', async () => {
      const stepId = await monitor.startStep('analyze', ExecutionStepType.phase);

      expect(stepId).toBeDefined();
      expect(mockRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          agentRunId: 'run-001',
          name: 'analyze',
          type: ExecutionStepType.phase,
          status: ExecutionStepStatus.running,
          startedAt: expect.any(Date),
        })
      );
    });

    it('should auto-increment sequence number via repository', async () => {
      vi.mocked(mockRepo.getNextSequenceNumber).mockResolvedValueOnce(3);

      await monitor.startStep('plan', ExecutionStepType.phase);

      expect(mockRepo.getNextSequenceNumber).toHaveBeenCalledWith('run-001', null);
      expect(mockRepo.save).toHaveBeenCalledWith(expect.objectContaining({ sequenceNumber: 3 }));
    });
  });

  describe('completeStep', () => {
    it('should update status=completed and compute duration', async () => {
      const stepId = await monitor.startStep('analyze', ExecutionStepType.phase);

      // Small delay to have non-zero duration
      await new Promise((r) => setTimeout(r, 10));

      await monitor.completeStep(stepId!, 'success');

      expect(mockRepo.update).toHaveBeenCalledWith(
        stepId,
        expect.objectContaining({
          status: ExecutionStepStatus.completed,
          completedAt: expect.any(Date),
          durationMs: expect.any(BigInt),
          outcome: 'success',
        })
      );
    });
  });

  describe('failStep', () => {
    it('should update status=failed and record error in metadata', async () => {
      const stepId = await monitor.startStep('implement', ExecutionStepType.phase);

      await monitor.failStep(stepId!, 'timeout after 300s');

      expect(mockRepo.update).toHaveBeenCalledWith(
        stepId,
        expect.objectContaining({
          status: ExecutionStepStatus.failed,
          outcome: 'failed',
          metadata: expect.stringContaining('timeout after 300s'),
        })
      );
    });
  });

  describe('startSubStep', () => {
    it('should create child step with correct parentId', async () => {
      const parentId = await monitor.startStep('merge', ExecutionStepType.phase);

      vi.mocked(mockRepo.getNextSequenceNumber).mockResolvedValueOnce(0);

      const childId = await monitor.startSubStep(parentId!, 'commit', ExecutionStepType.subStep);

      expect(childId).toBeDefined();
      expect(mockRepo.save).toHaveBeenLastCalledWith(
        expect.objectContaining({
          parentId: parentId,
          name: 'commit',
          type: ExecutionStepType.subStep,
        })
      );
      expect(mockRepo.getNextSequenceNumber).toHaveBeenCalledWith('run-001', parentId);
    });
  });

  describe('recordMetadata', () => {
    it('should merge metadata without overwriting', async () => {
      const stepId = await monitor.startStep('approval', ExecutionStepType.approvalWait);

      await monitor.recordMetadata(stepId!, { input: 'looks good' });

      expect(mockRepo.update).toHaveBeenCalledWith(stepId, {
        metadata: JSON.stringify({ input: 'looks good' }),
      });
    });
  });

  describe('error swallowing', () => {
    it('should swallow errors from repository save', async () => {
      vi.mocked(mockRepo.save).mockRejectedValue(new Error('DB error'));

      const stepId = await monitor.startStep('analyze', ExecutionStepType.phase);

      expect(stepId).toBeNull();
    });

    it('should swallow errors from repository update', async () => {
      vi.mocked(mockRepo.update).mockRejectedValue(new Error('DB error'));

      const stepId = await monitor.startStep('analyze', ExecutionStepType.phase);

      // Should not throw
      await expect(monitor.completeStep(stepId!, 'success')).resolves.toBeUndefined();
    });
  });

  describe('lifecycle events', () => {
    it('should record lifecycle events as instant steps', async () => {
      await monitor.recordLifecycleEvent('run:started');

      expect(mockRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'run:started',
          type: ExecutionStepType.lifecycleEvent,
          status: ExecutionStepStatus.completed,
          durationMs: BigInt(0),
        })
      );
    });
  });
});
