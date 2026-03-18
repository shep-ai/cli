import { describe, it, expect } from 'vitest';
import {
  safeYamlDump,
  safeYamlLoad,
} from '@/infrastructure/services/agents/feature-agent/nodes/node-helpers.js';

describe('node-helpers YAML utilities', () => {
  describe('safeYamlDump', () => {
    describe('quote handling', () => {
      it('should handle single quotes in contractions', () => {
        const input = { text: "it's working" };
        const yaml = safeYamlDump(input);
        const parsed = safeYamlLoad(yaml);
        expect(parsed).toEqual(input);
        expect(yaml).toContain('"it\'s working"');
      });

      it('should handle double quotes in strings', () => {
        const input = { text: 'say "hello"' };
        const yaml = safeYamlDump(input);
        const parsed = safeYamlLoad(yaml);
        expect(parsed).toEqual(input);
        expect(yaml).toContain('\\"hello\\"');
      });

      it('should handle mixed single and double quotes', () => {
        const input = { text: 'it\'s time to say "hello"' };
        const yaml = safeYamlDump(input);
        const parsed = safeYamlLoad(yaml);
        expect(parsed).toEqual(input);
      });
    });

    describe('newlines and multi-line content', () => {
      it('should handle newlines in strings', () => {
        const input = { text: 'line1\nline2' };
        const yaml = safeYamlDump(input);
        const parsed = safeYamlLoad(yaml);
        expect(parsed).toEqual(input);
      });

      it('should handle multi-line content with multiple newlines', () => {
        const input = { description: 'first line\nsecond line\nthird line' };
        const yaml = safeYamlDump(input);
        const parsed = safeYamlLoad(yaml);
        expect(parsed).toEqual(input);
      });
    });

    describe('special characters', () => {
      it('should handle colons in strings', () => {
        const input = { text: 'key: value' };
        const yaml = safeYamlDump(input);
        const parsed = safeYamlLoad(yaml);
        expect(parsed).toEqual(input);
        expect(yaml).toContain('"key: value"');
      });

      it('should handle hashes in strings', () => {
        const input = { text: '# this is not a comment' };
        const yaml = safeYamlDump(input);
        const parsed = safeYamlLoad(yaml);
        expect(parsed).toEqual(input);
        expect(yaml).toContain('"# this is not a comment"');
      });

      it('should handle braces in strings', () => {
        const input = { text: 'template {value}' };
        const yaml = safeYamlDump(input);
        const parsed = safeYamlLoad(yaml);
        expect(parsed).toEqual(input);
        expect(yaml).toContain('"template {value}"');
      });
    });

    describe('nested structures', () => {
      it('should handle nested objects', () => {
        const input = { parent: { child: { grandchild: 'value' } } };
        const yaml = safeYamlDump(input);
        const parsed = safeYamlLoad(yaml);
        expect(parsed).toEqual(input);
      });

      it('should handle arrays', () => {
        const input = { items: ['first', 'second', 'third'] };
        const yaml = safeYamlDump(input);
        const parsed = safeYamlLoad(yaml);
        expect(parsed).toEqual(input);
      });

      it('should handle arrays with special characters', () => {
        const input = { items: ["it's working", 'say "hello"', 'key: value'] };
        const yaml = safeYamlDump(input);
        const parsed = safeYamlLoad(yaml);
        expect(parsed).toEqual(input);
      });

      it('should handle deeply nested mixed structures', () => {
        const input = {
          level1: {
            level2: {
              items: ["it's working", 'key: value'],
              nested: { value: 'say "hello"' },
            },
          },
        };
        const yaml = safeYamlDump(input);
        const parsed = safeYamlLoad(yaml);
        expect(parsed).toEqual(input);
      });
    });

    describe('edge cases', () => {
      it('should handle null values', () => {
        const input = { value: null };
        const yaml = safeYamlDump(input);
        const parsed = safeYamlLoad(yaml);
        expect(parsed).toEqual(input);
      });

      it('should handle empty strings', () => {
        const input = { text: '' };
        const yaml = safeYamlDump(input);
        const parsed = safeYamlLoad(yaml);
        expect(parsed).toEqual(input);
        expect(yaml).toContain('""');
      });

      it('should handle undefined values by omitting them', () => {
        const input = { defined: 'value', undefined: undefined };
        const yaml = safeYamlDump(input);
        const parsed = safeYamlLoad(yaml) as Record<string, unknown>;
        expect(parsed.defined).toBe('value');
        expect('undefined' in parsed).toBe(false);
      });

      it('should handle numbers', () => {
        const input = { count: 42, decimal: 3.14 };
        const yaml = safeYamlDump(input);
        const parsed = safeYamlLoad(yaml);
        expect(parsed).toEqual(input);
      });

      it('should handle booleans', () => {
        const input = { isTrue: true, isFalse: false };
        const yaml = safeYamlDump(input);
        const parsed = safeYamlLoad(yaml);
        expect(parsed).toEqual(input);
      });

      it('should handle empty objects', () => {
        const input = { empty: {} };
        const yaml = safeYamlDump(input);
        const parsed = safeYamlLoad(yaml);
        expect(parsed).toEqual(input);
      });

      it('should handle empty arrays', () => {
        const input = { items: [] };
        const yaml = safeYamlDump(input);
        const parsed = safeYamlLoad(yaml);
        expect(parsed).toEqual(input);
      });
    });

    describe('serialization options', () => {
      it('should use 2-space indentation', () => {
        const input = { parent: { child: 'value' } };
        const yaml = safeYamlDump(input);
        const lines = yaml.split('\n');
        expect(lines[1]).toMatch(/^ {2}child:/);
      });

      it('should not wrap long lines (lineWidth: -1)', () => {
        const longString = 'a'.repeat(200);
        const input = { text: longString };
        const yaml = safeYamlDump(input);
        const lines = yaml.split('\n');
        // The value should be on a single line (plus the key line)
        expect(lines.length).toBeLessThanOrEqual(2);
      });

      it('should force double quotes for all strings', () => {
        const input = { simple: 'value', withSpace: 'hello world', number: '123' };
        const yaml = safeYamlDump(input);
        // All string values should be double-quoted
        expect(yaml).toContain('simple: "value"');
        expect(yaml).toContain('withSpace: "hello world"');
        expect(yaml).toContain('number: "123"');
      });
    });

    describe('round-trip consistency', () => {
      it('should preserve data through serialize → parse → serialize cycle', () => {
        const input = {
          name: 'test feature',
          description: 'it\'s working with "quotes" and special chars: #{}',
          nested: {
            items: ['first', 'second', 'third'],
            value: null,
          },
          count: 42,
        };
        const yaml1 = safeYamlDump(input);
        const parsed = safeYamlLoad(yaml1);
        const yaml2 = safeYamlDump(parsed);
        expect(yaml1).toBe(yaml2);
        expect(parsed).toEqual(input);
      });

      it('should handle complex AI-generated content', () => {
        const input = {
          summary: "Fix the authentication bug — it's critical",
          description:
            'Users can\'t login when they use special characters like "admin@example.com" or passwords with colons: like "pass:word"',
          rationale: "This is a high-priority fix because it's blocking production deployments.",
          tasks: [
            { id: 'task-1', description: 'Update validation logic' },
            { id: 'task-2', description: 'Add test for edge case: empty password' },
          ],
        };
        const yaml = safeYamlDump(input);
        const parsed = safeYamlLoad(yaml);
        expect(parsed).toEqual(input);
      });
    });
  });
});
