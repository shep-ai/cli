/**
 * Node Helpers Unit Tests
 *
 * Tests for the shouldInterrupt function and interrupt logic
 * within the executeNode helper.
 *
 * TDD Phase: RED
 */

import { describe, it, expect } from 'vitest';
import {
  shouldInterrupt,
  safeYamlLoad,
} from '../../../../../../src/infrastructure/services/agents/feature-agent/nodes/node-helpers.js';

describe('safeYamlLoad', () => {
  it('parses valid YAML normally', () => {
    const content = `tasks:\n  - id: task-1\n    title: Do something`;
    const result = safeYamlLoad(content) as { tasks: { id: string; title: string }[] };
    expect(result.tasks[0].id).toBe('task-1');
    expect(result.tasks[0].title).toBe('Do something');
  });

  it('handles list items with unquoted braces', () => {
    const content = `tdd:\n  red:\n    - Assert screen.getByRole('heading', { name: 'Widgets' }) is in the document`;
    const result = safeYamlLoad(content) as { tdd: { red: string[] } };
    expect(result.tdd.red[0]).toContain('getByRole');
    expect(result.tdd.red[0]).toContain('{ name:');
  });

  it('handles multiple list items with braces', () => {
    const content = [
      'steps:',
      '  - Add icon={LayoutDashboard} to sidebar',
      "  - Check active={pathname === '/widgets'}",
      '  - Normal item without braces',
    ].join('\n');
    const result = safeYamlLoad(content) as { steps: string[] };
    expect(result.steps).toHaveLength(3);
    expect(result.steps[0]).toContain('{LayoutDashboard}');
    expect(result.steps[1]).toContain('{pathname');
    expect(result.steps[2]).toBe('Normal item without braces');
  });

  it('does not double-quote already quoted items', () => {
    const content = `items:\n  - "Already quoted { braces }"`;
    const result = safeYamlLoad(content) as { items: string[] };
    expect(result.items[0]).toBe('Already quoted { braces }');
  });

  it('throws on genuinely invalid YAML without braces', () => {
    const content = `bad:\n  - item\n invalid: [`;
    expect(() => safeYamlLoad(content)).toThrow();
  });
});

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
