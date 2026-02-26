/**
 * Graph Middleware Tests
 *
 * TDD Phase: RED → GREEN → REFACTOR
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  instrumentNode,
  EXECUTION_MONITOR_CONFIG_KEY,
} from '@/infrastructure/services/agents/feature-agent/graph-middleware.js';
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

describe('Graph Middleware', () => {
  let mockRepo: IExecutionStepRepository;
  let monitor: ExecutionMonitor;

  beforeEach(() => {
    mockRepo = createMockRepo();
    monitor = new ExecutionMonitor('run-001', mockRepo);
  });

  describe('instrumentNode', () => {
    it('should wrap a node and record start/end', async () => {
      const originalFn = vi.fn().mockResolvedValue({ messages: ['done'] });

      const wrapped = instrumentNode('analyze', originalFn, monitor);

      const state = { featureId: 'f1' };
      const config = {};
      const result = await wrapped(state, config);

      // Original function called with enriched config (monitor injected)
      expect(originalFn).toHaveBeenCalledWith(
        state,
        expect.objectContaining({
          configurable: expect.objectContaining({
            [EXECUTION_MONITOR_CONFIG_KEY]: expect.any(ExecutionMonitor),
          }),
        })
      );
      expect(result).toEqual({ messages: ['done'] });

      // Step was saved (start) and updated (end)
      expect(mockRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'analyze',
          type: ExecutionStepType.phase,
          status: ExecutionStepStatus.running,
        })
      );
      expect(mockRepo.update).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          status: ExecutionStepStatus.completed,
          outcome: 'success',
        })
      );
    });

    it('should handle node errors and record failure then re-throw', async () => {
      const error = new Error('node crashed');
      const originalFn = vi.fn().mockRejectedValue(error);

      const wrapped = instrumentNode('implement', originalFn, monitor);

      await expect(wrapped({}, {})).rejects.toThrow('node crashed');

      // Step failure recorded
      expect(mockRepo.update).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          status: ExecutionStepStatus.failed,
          outcome: 'failed',
        })
      );
    });

    it('should classify validation/repair nodes as subStep type', async () => {
      const originalFn = vi.fn().mockResolvedValue({});

      const wrapped = instrumentNode('validate_spec_analyze', originalFn, monitor);
      await wrapped({}, {});

      expect(mockRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'validate_spec_analyze',
          type: ExecutionStepType.subStep,
        })
      );
    });

    it('should inject ExecutionMonitor into config', async () => {
      const originalFn = vi.fn().mockImplementation((_state, config) => {
        const injectedMonitor = config?.configurable?.[EXECUTION_MONITOR_CONFIG_KEY];
        expect(injectedMonitor).toBeInstanceOf(ExecutionMonitor);
        return {};
      });

      const wrapped = instrumentNode('merge', originalFn, monitor);
      await wrapped({}, { configurable: {} });

      expect(originalFn).toHaveBeenCalled();
    });

    it('should not break node execution if monitoring fails', async () => {
      vi.mocked(mockRepo.save).mockRejectedValue(new Error('DB down'));

      const originalFn = vi.fn().mockResolvedValue({ ok: true });
      const wrapped = instrumentNode('analyze', originalFn, monitor);

      const result = await wrapped({}, {});

      // Node still executed successfully
      expect(result).toEqual({ ok: true });
      expect(originalFn).toHaveBeenCalled();
    });
  });
});
