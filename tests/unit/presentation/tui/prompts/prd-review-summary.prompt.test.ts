/**
 * PRD Review Summary Prompt Config Unit Tests
 *
 * TDD Phase: RED -> GREEN
 */

import { describe, it, expect } from 'vitest';
import { createReviewActionConfig } from '../../../../../src/presentation/tui/prompts/prd-review-summary.prompt.js';
import { shepTheme } from '../../../../../src/presentation/tui/themes/shep.theme.js';

describe('createReviewActionConfig', () => {
  it('should show change count in message when changes exist', () => {
    const config = createReviewActionConfig(3);
    expect(config.message).toContain('3 changes');
  });

  it('should show singular label for 1 change', () => {
    const config = createReviewActionConfig(1);
    expect(config.message).toContain('1 change');
    expect(config.message).not.toContain('1 changes');
  });

  it('should not show count when no changes', () => {
    const config = createReviewActionConfig(0);
    expect(config.message).not.toContain('0');
  });

  it('should have approve and reject choices', () => {
    const config = createReviewActionConfig(0);
    const values = config.choices.map((c) => c.value);
    expect(values).toContain('approve');
    expect(values).toContain('reject');
  });

  it('should use shepTheme', () => {
    const config = createReviewActionConfig(0);
    expect(config.theme).toBe(shepTheme);
  });
});
