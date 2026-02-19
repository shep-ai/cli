import { describe, it, expect } from 'vitest';

import {
  buildCiFixPrompt,
  type CiFixPromptParams,
} from '@/infrastructure/services/agents/feature-agent/nodes/prompts/merge.prompt.js';

describe('buildCiFixPrompt', () => {
  const defaultParams: CiFixPromptParams = {
    logExcerpt: 'ERROR: src/foo.ts(42): Type "string" is not assignable to type "number"',
    specSummary: 'Add worktree merge flow to automate PR creation and CI monitoring',
    attempt: 1,
    maxAttempts: 3,
  };

  it('returns a string containing the log excerpt', () => {
    const result = buildCiFixPrompt(defaultParams);
    expect(result).toContain(defaultParams.logExcerpt);
  });

  it('includes the attempt number and max attempts', () => {
    const result = buildCiFixPrompt({ ...defaultParams, attempt: 2 });
    expect(result).toContain('2');
    expect(result).toContain('3');
  });

  it('includes the spec summary for context', () => {
    const result = buildCiFixPrompt(defaultParams);
    expect(result).toContain(defaultParams.specSummary);
  });

  it('result length is bounded under 10000 chars for typical inputs', () => {
    const result = buildCiFixPrompt(defaultParams);
    expect(result.length).toBeLessThan(10000);
  });

  it('truncates very long log excerpts to keep total length bounded', () => {
    const longLog = 'X'.repeat(20000);
    const result = buildCiFixPrompt({ ...defaultParams, logExcerpt: longLog });
    expect(result.length).toBeLessThan(10000);
  });

  it('provides focused fix instructions', () => {
    const result = buildCiFixPrompt(defaultParams);
    expect(result).toMatch(/fix/i);
    expect(result).toMatch(/do not|don't|avoid/i);
  });
});
