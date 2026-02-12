/**
 * Node Helpers Unit Tests
 *
 * Tests for the shouldInterrupt function and interrupt logic
 * within the executeNode helper.
 *
 * TDD Phase: RED
 */

import { describe, it, expect } from 'vitest';
import { shouldInterrupt } from '../../../../../../src/infrastructure/services/agents/feature-agent/nodes/node-helpers.js';

describe('shouldInterrupt', () => {
  describe('interactive mode', () => {
    it('should interrupt on analyze node', () => {
      expect(shouldInterrupt('analyze', 'interactive')).toBe(true);
    });

    it('should interrupt on requirements node', () => {
      expect(shouldInterrupt('requirements', 'interactive')).toBe(true);
    });

    it('should interrupt on research node', () => {
      expect(shouldInterrupt('research', 'interactive')).toBe(true);
    });

    it('should interrupt on plan node', () => {
      expect(shouldInterrupt('plan', 'interactive')).toBe(true);
    });

    it('should interrupt on implement node', () => {
      expect(shouldInterrupt('implement', 'interactive')).toBe(true);
    });
  });

  describe('allow-prd mode', () => {
    it('should NOT interrupt on analyze node', () => {
      expect(shouldInterrupt('analyze', 'allow-prd')).toBe(false);
    });

    it('should NOT interrupt on requirements node', () => {
      expect(shouldInterrupt('requirements', 'allow-prd')).toBe(false);
    });

    it('should interrupt on research node', () => {
      expect(shouldInterrupt('research', 'allow-prd')).toBe(true);
    });

    it('should interrupt on plan node', () => {
      expect(shouldInterrupt('plan', 'allow-prd')).toBe(true);
    });

    it('should interrupt on implement node', () => {
      expect(shouldInterrupt('implement', 'allow-prd')).toBe(true);
    });
  });

  describe('allow-plan mode', () => {
    it('should NOT interrupt on analyze node', () => {
      expect(shouldInterrupt('analyze', 'allow-plan')).toBe(false);
    });

    it('should NOT interrupt on requirements node', () => {
      expect(shouldInterrupt('requirements', 'allow-plan')).toBe(false);
    });

    it('should NOT interrupt on research node', () => {
      expect(shouldInterrupt('research', 'allow-plan')).toBe(false);
    });

    it('should NOT interrupt on plan node', () => {
      expect(shouldInterrupt('plan', 'allow-plan')).toBe(false);
    });

    it('should interrupt on implement node', () => {
      expect(shouldInterrupt('implement', 'allow-plan')).toBe(true);
    });
  });

  describe('allow-all mode (default)', () => {
    it('should never interrupt', () => {
      const nodes = ['analyze', 'requirements', 'research', 'plan', 'implement'];
      for (const node of nodes) {
        expect(shouldInterrupt(node, 'allow-all')).toBe(false);
      }
    });
  });

  describe('undefined approval mode', () => {
    it('should never interrupt when approvalMode is undefined', () => {
      const nodes = ['analyze', 'requirements', 'research', 'plan', 'implement'];
      for (const node of nodes) {
        expect(shouldInterrupt(node, undefined)).toBe(false);
      }
    });
  });
});
