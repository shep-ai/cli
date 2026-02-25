/**
 * Workflow Defaults Step Unit Tests
 *
 * Verifies the checkbox configuration shape and item properties.
 */

import { describe, it, expect } from 'vitest';
import { workflowDefaultsConfig } from '../../../../../../../src/presentation/tui/wizards/onboarding/steps/workflow-defaults.step.js';

describe('workflowDefaultsConfig', () => {
  it('should have 5 checkbox items', () => {
    expect(workflowDefaultsConfig.choices).toHaveLength(5);
  });

  it('should have all items with name, value, and description', () => {
    for (const item of workflowDefaultsConfig.choices) {
      expect(item.name).toBeDefined();
      expect(typeof item.name).toBe('string');
      expect(item.value).toBeDefined();
      expect(typeof item.value).toBe('string');
      expect(item.description).toBeDefined();
      expect(typeof item.description).toBe('string');
    }
  });

  it('should have all items unchecked by default', () => {
    for (const item of workflowDefaultsConfig.choices) {
      expect(item.checked).toBe(false);
    }
  });

  it('should include all expected workflow default keys', () => {
    const values = workflowDefaultsConfig.choices.map((c) => c.value);
    expect(values).toContain('allowPrd');
    expect(values).toContain('allowPlan');
    expect(values).toContain('allowMerge');
    expect(values).toContain('pushOnImplementationComplete');
    expect(values).toContain('openPrOnImplementationComplete');
  });

  it('should use shepTheme', () => {
    expect(workflowDefaultsConfig.theme).toBeDefined();
  });
});
