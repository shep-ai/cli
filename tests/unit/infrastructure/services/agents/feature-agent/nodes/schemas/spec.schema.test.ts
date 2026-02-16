import { describe, it, expect } from 'vitest';
import {
  validateSpecAnalyze,
  validateSpecRequirements,
} from '@/infrastructure/services/agents/feature-agent/nodes/schemas/spec.schema.js';

const validAnalyzeSpec = {
  name: 'test-feature',
  oneLiner: 'A test feature',
  summary: 'This is a test feature for validation',
  phase: 'Analysis',
  sizeEstimate: 'M',
  technologies: ['TypeScript'],
  content: '## Problem Statement\nSome content here',
};

describe('validateSpecAnalyze', () => {
  it('passes for a valid analyze spec', () => {
    const result = validateSpecAnalyze(validAnalyzeSpec);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('fails when name is missing', () => {
    const { name: _, ...data } = validAnalyzeSpec;
    const result = validateSpecAnalyze(data);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Missing required string field 'name'");
  });

  it('fails when technologies is empty', () => {
    const result = validateSpecAnalyze({ ...validAnalyzeSpec, technologies: [] });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Field 'technologies' must not be empty");
  });

  it('fails when sizeEstimate is invalid', () => {
    const result = validateSpecAnalyze({ ...validAnalyzeSpec, sizeEstimate: 'Huge' });
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('sizeEstimate');
    expect(result.errors[0]).toContain('S, M, L, XL');
  });

  it('fails for null input', () => {
    const result = validateSpecAnalyze(null);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('YAML parsed to null or non-object');
  });
});

const validRequirementsSpec = {
  ...validAnalyzeSpec,
  phase: 'Requirements',
  openQuestions: [{ question: 'Should we use X?', resolved: true, answer: 'Yes because...' }],
};

describe('validateSpecRequirements', () => {
  it('passes for a valid requirements spec', () => {
    const result = validateSpecRequirements(validRequirementsSpec);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('fails when openQuestions is missing', () => {
    const { openQuestions: _, ...data } = validRequirementsSpec;
    const result = validateSpecRequirements(data);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('openQuestions');
  });

  it('fails when openQuestion item missing question field', () => {
    const data = {
      ...validRequirementsSpec,
      openQuestions: [{ resolved: true, answer: 'Yes' }],
    };
    const result = validateSpecRequirements(data);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('question');
  });

  it('passes when openQuestions is empty array (no questions is valid)', () => {
    const data = { ...validRequirementsSpec, openQuestions: [] };
    const result = validateSpecRequirements(data);
    expect(result.valid).toBe(true);
  });
});
