/**
 * PRD Review Question Prompt Config Unit Tests
 *
 * TDD Phase: RED -> GREEN
 */

import { describe, it, expect } from 'vitest';
import { createQuestionSelectConfig } from '../../../../../src/presentation/tui/prompts/prd-review-question.prompt.js';
import { shepTheme } from '../../../../../src/presentation/tui/themes/shep.theme.js';

describe('createQuestionSelectConfig', () => {
  const options = [
    { option: 'Option A', description: 'Description A', selected: true },
    { option: 'Option B', description: 'Description B', selected: false },
  ];

  it('should create a select config with question as message', () => {
    const config = createQuestionSelectConfig('Which approach?', options);
    expect(config.message).toBe('Which approach?');
  });

  it('should prefix message with question number when provided', () => {
    const config = createQuestionSelectConfig('Which approach?', options, undefined, 2, 5);
    expect(config.message).toBe('[2/5] Which approach?');
  });

  it('should not prefix message when question number is not provided', () => {
    const config = createQuestionSelectConfig('Which approach?', options, 'Option A');
    expect(config.message).toBe('Which approach?');
  });

  it('should map options to choices with name, value, description', () => {
    const config = createQuestionSelectConfig('Which approach?', options);
    expect(config.choices).toEqual([
      { name: 'Option A', value: 'Option A', description: 'Description A' },
      { name: 'Option B', value: 'Option B', description: 'Description B' },
    ]);
  });

  it('should set default to current answer if provided', () => {
    const config = createQuestionSelectConfig('Which approach?', options, 'Option B');
    expect(config.default).toBe('Option B');
  });

  it('should not set default if no current answer', () => {
    const config = createQuestionSelectConfig('Which approach?', options);
    expect(config.default).toBeUndefined();
  });

  it('should use shepTheme', () => {
    const config = createQuestionSelectConfig('Which approach?', options);
    expect(config.theme).toBe(shepTheme);
  });
});
