/**
 * Lifecycle Context Unit Tests
 *
 * Tests for the module-level singleton that allows graph nodes
 * to update the feature's SDLC lifecycle as they execute.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  setLifecycleContext,
  clearLifecycleContext,
  updateNodeLifecycle,
} from '@/infrastructure/services/agents/feature-agent/lifecycle-context.js';
import type { IFeatureRepository } from '@/application/ports/output/repositories/feature-repository.interface.js';
import { SdlcLifecycle } from '@/domain/generated/output.js';

function createMockFeatureRepo(feature: Record<string, unknown> | null = null): IFeatureRepository {
  return {
    findById: vi.fn().mockResolvedValue(
      feature ?? {
        id: 'feat-1',
        lifecycle: SdlcLifecycle.Requirements,
        updatedAt: new Date(),
      }
    ),
    update: vi.fn().mockResolvedValue(undefined),
    save: vi.fn().mockResolvedValue(undefined),
    list: vi.fn().mockResolvedValue([]),
    delete: vi.fn().mockResolvedValue(undefined),
    findBySlug: vi.fn().mockResolvedValue(null),
  } as unknown as IFeatureRepository;
}

describe('LifecycleContext', () => {
  beforeEach(() => {
    clearLifecycleContext();
  });

  describe('setLifecycleContext / clearLifecycleContext', () => {
    it('should allow setting and clearing context', () => {
      const repo = createMockFeatureRepo();
      setLifecycleContext('feat-1', repo);
      clearLifecycleContext();
    });
  });

  describe('updateNodeLifecycle', () => {
    it('should update feature lifecycle to Analyze for analyze node', async () => {
      const repo = createMockFeatureRepo();
      setLifecycleContext('feat-1', repo);

      await updateNodeLifecycle('analyze');

      expect(repo.findById).toHaveBeenCalledWith('feat-1');
      expect(repo.update).toHaveBeenCalledWith(
        expect.objectContaining({
          lifecycle: SdlcLifecycle.Analyze,
          updatedAt: expect.any(Date),
        })
      );
    });

    it('should update feature lifecycle to Requirements for requirements node', async () => {
      const repo = createMockFeatureRepo();
      setLifecycleContext('feat-1', repo);

      await updateNodeLifecycle('requirements');

      expect(repo.update).toHaveBeenCalledWith(
        expect.objectContaining({ lifecycle: SdlcLifecycle.Requirements })
      );
    });

    it('should update feature lifecycle to Research for research node', async () => {
      const repo = createMockFeatureRepo();
      setLifecycleContext('feat-1', repo);

      await updateNodeLifecycle('research');

      expect(repo.update).toHaveBeenCalledWith(
        expect.objectContaining({ lifecycle: SdlcLifecycle.Research })
      );
    });

    it('should update feature lifecycle to Planning for plan node', async () => {
      const repo = createMockFeatureRepo();
      setLifecycleContext('feat-1', repo);

      await updateNodeLifecycle('plan');

      expect(repo.update).toHaveBeenCalledWith(
        expect.objectContaining({ lifecycle: SdlcLifecycle.Planning })
      );
    });

    it('should update feature lifecycle to Implementation for implement node', async () => {
      const repo = createMockFeatureRepo();
      setLifecycleContext('feat-1', repo);

      await updateNodeLifecycle('implement');

      expect(repo.update).toHaveBeenCalledWith(
        expect.objectContaining({ lifecycle: SdlcLifecycle.Implementation })
      );
    });

    it('should update feature lifecycle to Review for merge node', async () => {
      const repo = createMockFeatureRepo();
      setLifecycleContext('feat-1', repo);

      await updateNodeLifecycle('merge');

      expect(repo.update).toHaveBeenCalledWith(
        expect.objectContaining({ lifecycle: SdlcLifecycle.Review })
      );
    });

    it('should be a no-op when context is not set', async () => {
      // No context set — should not throw
      await updateNodeLifecycle('analyze');
    });

    it('should be a no-op for unknown node names', async () => {
      const repo = createMockFeatureRepo();
      setLifecycleContext('feat-1', repo);

      await updateNodeLifecycle('validate_spec_analyze');

      expect(repo.findById).not.toHaveBeenCalled();
      expect(repo.update).not.toHaveBeenCalled();
    });

    it('should be a no-op when feature is not found', async () => {
      const repo = createMockFeatureRepo(null);
      (repo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      setLifecycleContext('feat-missing', repo);

      await updateNodeLifecycle('analyze');

      expect(repo.findById).toHaveBeenCalledWith('feat-missing');
      expect(repo.update).not.toHaveBeenCalled();
    });

    it('should not throw when repository update fails', async () => {
      const repo = createMockFeatureRepo();
      (repo.update as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('DB error'));
      setLifecycleContext('feat-1', repo);

      // Should not throw
      await updateNodeLifecycle('analyze');
    });
  });
});
