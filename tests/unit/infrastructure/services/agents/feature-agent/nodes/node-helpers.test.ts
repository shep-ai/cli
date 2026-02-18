import { describe, it, expect } from 'vitest';
import type { ApprovalGates } from '@/domain/generated/output.js';
import { shouldInterrupt } from '@/infrastructure/services/agents/feature-agent/nodes/node-helpers.js';

/**
 * Helper to create ApprovalGates with defaults (all false).
 */
function makeGates(overrides: Partial<ApprovalGates> = {}): ApprovalGates {
  return {
    allowPrd: false,
    allowPlan: false,
    allowMerge: false,
    ...overrides,
  };
}

describe('shouldInterrupt', () => {
  describe('when gates is undefined', () => {
    it('returns false for any node', () => {
      expect(shouldInterrupt('requirements', undefined)).toBe(false);
      expect(shouldInterrupt('plan', undefined)).toBe(false);
      expect(shouldInterrupt('implement', undefined)).toBe(false);
      expect(shouldInterrupt('merge', undefined)).toBe(false);
    });
  });

  describe('fully autonomous (all 3 gates true)', () => {
    it('returns false for any node when all gates are true', () => {
      const gates = makeGates({ allowPrd: true, allowPlan: true, allowMerge: true });
      expect(shouldInterrupt('requirements', gates)).toBe(false);
      expect(shouldInterrupt('plan', gates)).toBe(false);
      expect(shouldInterrupt('implement', gates)).toBe(false);
      expect(shouldInterrupt('merge', gates)).toBe(false);
    });

    it('does NOT skip all interrupts when only 2 of 3 gates are true', () => {
      const gates = makeGates({ allowPrd: true, allowPlan: true, allowMerge: false });
      // merge should still interrupt
      expect(shouldInterrupt('merge', gates)).toBe(true);
    });
  });

  describe('requirements node', () => {
    it('interrupts when allowPrd is false', () => {
      const gates = makeGates({ allowPrd: false });
      expect(shouldInterrupt('requirements', gates)).toBe(true);
    });

    it('does not interrupt when allowPrd is true', () => {
      const gates = makeGates({ allowPrd: true });
      expect(shouldInterrupt('requirements', gates)).toBe(false);
    });
  });

  describe('plan node', () => {
    it('interrupts when allowPlan is false', () => {
      const gates = makeGates({ allowPlan: false });
      expect(shouldInterrupt('plan', gates)).toBe(true);
    });

    it('does not interrupt when allowPlan is true', () => {
      const gates = makeGates({ allowPlan: true });
      expect(shouldInterrupt('plan', gates)).toBe(false);
    });
  });

  describe('implement node', () => {
    it('interrupts when gates exist but not fully autonomous', () => {
      const gates = makeGates({ allowPrd: true, allowPlan: false });
      expect(shouldInterrupt('implement', gates)).toBe(true);
    });
  });

  describe('merge node', () => {
    it('interrupts when allowMerge is false', () => {
      const gates = makeGates({ allowMerge: false });
      expect(shouldInterrupt('merge', gates)).toBe(true);
    });

    it('does not interrupt when allowMerge is true', () => {
      const gates = makeGates({ allowMerge: true });
      expect(shouldInterrupt('merge', gates)).toBe(false);
    });

    it('does not interrupt when autoMerge is true (overrides allowMerge)', () => {
      const gates = makeGates({ allowMerge: false });
      expect(shouldInterrupt('merge', gates, true)).toBe(false);
    });
  });

  describe('unknown nodes', () => {
    it('returns false for nodes without gates (e.g. analyze, research)', () => {
      const gates = makeGates();
      expect(shouldInterrupt('analyze', gates)).toBe(false);
      expect(shouldInterrupt('research', gates)).toBe(false);
    });
  });
});
