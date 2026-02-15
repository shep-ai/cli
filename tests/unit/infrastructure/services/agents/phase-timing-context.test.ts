/**
 * Phase Timing Context Unit Tests
 *
 * Tests for the module-level singleton that provides phase timing
 * recording to executeNode() without changing its public API.
 *
 * TDD Phase: RED
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  setPhaseTimingContext,
  clearPhaseTimingContext,
  recordPhaseStart,
  recordPhaseEnd,
} from '../../../../../src/infrastructure/services/agents/feature-agent/phase-timing-context.js';
import type { IPhaseTimingRepository } from '../../../../../src/application/ports/output/agents/phase-timing-repository.interface.js';

function createMockTimingRepo(): IPhaseTimingRepository {
  return {
    save: vi.fn().mockResolvedValue(undefined),
    update: vi.fn().mockResolvedValue(undefined),
    findByRunId: vi.fn().mockResolvedValue([]),
    findByFeatureId: vi.fn().mockResolvedValue([]),
  };
}

describe('PhaseTimingContext', () => {
  beforeEach(() => {
    clearPhaseTimingContext();
  });

  describe('setPhaseTimingContext / clearPhaseTimingContext', () => {
    it('should allow setting and clearing context', () => {
      const repo = createMockTimingRepo();
      // Should not throw
      setPhaseTimingContext('run-1', repo);
      clearPhaseTimingContext();
    });
  });

  describe('recordPhaseStart', () => {
    it('should save a timing record when context is set', async () => {
      const repo = createMockTimingRepo();
      setPhaseTimingContext('run-1', repo);

      const timingId = await recordPhaseStart('analyze');

      expect(timingId).toBeDefined();
      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          agentRunId: 'run-1',
          phase: 'analyze',
          startedAt: expect.any(Date),
        })
      );
    });

    it('should return null when context is not set', async () => {
      const timingId = await recordPhaseStart('analyze');
      expect(timingId).toBeNull();
    });

    it('should return null and not throw when save fails', async () => {
      const repo = createMockTimingRepo();
      (repo.save as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('DB error'));
      setPhaseTimingContext('run-1', repo);

      const timingId = await recordPhaseStart('analyze');
      expect(timingId).toBeNull();
    });
  });

  describe('recordPhaseEnd', () => {
    it('should update timing record with completedAt and durationMs', async () => {
      const repo = createMockTimingRepo();
      setPhaseTimingContext('run-1', repo);

      const timingId = await recordPhaseStart('plan');
      expect(timingId).not.toBeNull();

      await recordPhaseEnd(timingId!, 1500);

      expect(repo.update).toHaveBeenCalledWith(timingId!, {
        completedAt: expect.any(Date),
        durationMs: BigInt(1500),
      });
    });

    it('should not throw when update fails', async () => {
      const repo = createMockTimingRepo();
      (repo.update as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('DB error'));
      setPhaseTimingContext('run-1', repo);

      const timingId = await recordPhaseStart('plan');
      // Should not throw
      await recordPhaseEnd(timingId!, 1000);
    });

    it('should be a no-op when timingId is null', async () => {
      const repo = createMockTimingRepo();
      setPhaseTimingContext('run-1', repo);

      await recordPhaseEnd(null, 1000);
      expect(repo.update).not.toHaveBeenCalled();
    });
  });
});
