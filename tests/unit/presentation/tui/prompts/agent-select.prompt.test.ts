/**
 * Agent Select Prompt Config Unit Tests
 *
 * TDD Phase: RED -> GREEN
 */

import { describe, it, expect } from 'vitest';
import { createAgentSelectConfig } from '../../../../../src/presentation/tui/prompts/agent-select.prompt.js';
import { AgentType } from '../../../../../packages/core/src/domain/generated/output.js';

describe('createAgentSelectConfig', () => {
  it('includes a Dev (Mock) choice with value "dev"', () => {
    const config = createAgentSelectConfig();
    const devChoice = config.choices.find((c) => c.value === AgentType.Dev);
    expect(devChoice).toBeDefined();
    expect(devChoice?.name).toContain('Dev (Mock)');
  });

  it('Dev (Mock) choice is not disabled', () => {
    const config = createAgentSelectConfig();
    const devChoice = config.choices.find((c) => c.value === AgentType.Dev);
    expect(devChoice).toBeDefined();
    expect((devChoice as { disabled?: unknown }).disabled).toBeFalsy();
  });

  it('Dev (Mock) choice has the correct description', () => {
    const config = createAgentSelectConfig();
    const devChoice = config.choices.find((c) => c.value === AgentType.Dev);
    expect((devChoice as { description?: string }).description).toBe(
      'Local development mock — no agent binary required'
    );
  });

  it('Dev (Mock) choice appears before disabled (Coming Soon) entries', () => {
    const config = createAgentSelectConfig();
    const devIndex = config.choices.findIndex((c) => c.value === AgentType.Dev);
    const disabledIndices = config.choices
      .map((c, i) => ((c as { disabled?: unknown }).disabled ? i : -1))
      .filter((i) => i !== -1);
    expect(devIndex).toBeGreaterThanOrEqual(0);
    disabledIndices.forEach((disabledIndex) => {
      expect(devIndex).toBeLessThan(disabledIndex);
    });
  });
});
