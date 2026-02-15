import { describe, it, expect } from 'vitest';
import {
  requireString,
  requireNonEmptyArray,
  requireArrayOfShape,
} from '../../../../../../../../src/infrastructure/services/agents/feature-agent/nodes/schemas/validation.js';

describe('validation helpers', () => {
  describe('requireString', () => {
    it('returns no errors for a valid string', () => {
      const errors: string[] = [];
      requireString({ name: 'hello' }, 'name', errors);
      expect(errors).toEqual([]);
    });

    it('adds error for missing field', () => {
      const errors: string[] = [];
      requireString({}, 'name', errors);
      expect(errors).toEqual(["Missing required string field 'name'"]);
    });

    it('adds error for non-string field', () => {
      const errors: string[] = [];
      requireString({ name: 123 }, 'name', errors);
      expect(errors).toEqual(["Field 'name' must be a string, got number"]);
    });

    it('adds error for empty string', () => {
      const errors: string[] = [];
      requireString({ name: '' }, 'name', errors);
      expect(errors).toEqual(["Field 'name' must not be empty"]);
    });
  });

  describe('requireNonEmptyArray', () => {
    it('returns no errors for a non-empty array', () => {
      const errors: string[] = [];
      requireNonEmptyArray({ items: [1, 2] }, 'items', errors);
      expect(errors).toEqual([]);
    });

    it('adds error for missing field', () => {
      const errors: string[] = [];
      requireNonEmptyArray({}, 'items', errors);
      expect(errors).toEqual(["Missing required array field 'items'"]);
    });

    it('adds error for non-array', () => {
      const errors: string[] = [];
      requireNonEmptyArray({ items: 'not-array' }, 'items', errors);
      expect(errors).toEqual(["Field 'items' must be an array, got string"]);
    });

    it('adds error for empty array', () => {
      const errors: string[] = [];
      requireNonEmptyArray({ items: [] }, 'items', errors);
      expect(errors).toEqual(["Field 'items' must not be empty"]);
    });
  });

  describe('requireArrayOfShape', () => {
    it('validates each item with the provided checker', () => {
      const errors: string[] = [];
      const data = { decisions: [{ title: 'A', chosen: 'B' }] };
      requireArrayOfShape(data, 'decisions', errors, (item, idx, errs) => {
        requireString(item as Record<string, unknown>, 'title', errs, `decisions[${idx}].`);
        requireString(item as Record<string, unknown>, 'chosen', errs, `decisions[${idx}].`);
      });
      expect(errors).toEqual([]);
    });

    it('reports errors with indexed paths', () => {
      const errors: string[] = [];
      const data = { decisions: [{ title: 'A' }, { chosen: 'B' }] };
      requireArrayOfShape(data, 'decisions', errors, (item, idx, errs) => {
        requireString(item as Record<string, unknown>, 'title', errs, `decisions[${idx}].`);
        requireString(item as Record<string, unknown>, 'chosen', errs, `decisions[${idx}].`);
      });
      expect(errors).toEqual([
        "Missing required string field 'decisions[0].chosen'",
        "Missing required string field 'decisions[1].title'",
      ]);
    });
  });
});
