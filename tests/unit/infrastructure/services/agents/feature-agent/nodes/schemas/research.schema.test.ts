import { describe, it, expect } from 'vitest';
import { validateResearch } from '@/infrastructure/services/agents/feature-agent/nodes/schemas/research.schema.js';

const validResearch = {
  name: 'test-feature',
  summary: 'Research findings summary',
  decisions: [
    {
      title: 'Database Choice',
      chosen: 'SQLite',
      rejected: ['PostgreSQL', 'MongoDB'],
      rationale: 'Lightweight and embedded',
    },
  ],
  content: '## Technology Decisions\nSome content',
};

describe('validateResearch', () => {
  it('passes for valid research', () => {
    const result = validateResearch(validResearch);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('fails when decisions is empty', () => {
    const result = validateResearch({ ...validResearch, decisions: [] });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Field 'decisions' must not be empty");
  });

  it('fails when a decision missing title', () => {
    const data = {
      ...validResearch,
      decisions: [{ chosen: 'X', rejected: ['Y'], rationale: 'Z' }],
    };
    const result = validateResearch(data);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('decisions[0].title');
  });

  it('fails when a decision missing rejected array', () => {
    const data = {
      ...validResearch,
      decisions: [{ title: 'A', chosen: 'B', rationale: 'C' }],
    };
    const result = validateResearch(data);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('decisions[0].rejected');
  });

  it('fails for null input', () => {
    const result = validateResearch(null);
    expect(result.valid).toBe(false);
  });
});
