/**
 * Workflow Defaults Step Unit Tests
 *
 * Verifies the checkbox configuration shape and item properties.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { buildWorkflowDefaultsConfig } from '../../../../../../../src/presentation/tui/wizards/onboarding/steps/workflow-defaults.step.js';
import { initI18n } from '../../../../../../../src/presentation/tui/i18n.js';

describe('buildWorkflowDefaultsConfig', () => {
  beforeAll(async () => {
    await initI18n('en');
  });

  it('should have 5 checkbox items', () => {
    const config = buildWorkflowDefaultsConfig();
    expect(config.choices).toHaveLength(5);
  });

  it('should have all items with name, value, and description', () => {
    const config = buildWorkflowDefaultsConfig();
    for (const item of config.choices) {
      expect(item.name).toBeDefined();
      expect(typeof item.name).toBe('string');
      expect(item.value).toBeDefined();
      expect(typeof item.value).toBe('string');
      expect(item.description).toBeDefined();
      expect(typeof item.description).toBe('string');
    }
  });

  it('should have all items unchecked by default', () => {
    const config = buildWorkflowDefaultsConfig();
    for (const item of config.choices) {
      expect(item.checked).toBe(false);
    }
  });

  it('should include all expected workflow default keys', () => {
    const config = buildWorkflowDefaultsConfig();
    const values = config.choices.map((c) => c.value);
    expect(values).toContain('allowPrd');
    expect(values).toContain('allowPlan');
    expect(values).toContain('allowMerge');
    expect(values).toContain('pushOnImplementationComplete');
    expect(values).toContain('openPrOnImplementationComplete');
  });

  it('should use shepTheme', () => {
    const config = buildWorkflowDefaultsConfig();
    expect(config.theme).toBeDefined();
  });
});
