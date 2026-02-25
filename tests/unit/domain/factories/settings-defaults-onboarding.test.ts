/**
 * Settings Defaults Factory — Onboarding Fields Tests
 *
 * Tests for onboardingComplete and approvalGateDefaults fields
 * added to createDefaultSettings() for the first-run onboarding feature.
 */

import { describe, it, expect } from 'vitest';
import { createDefaultSettings } from '@/domain/factories/settings-defaults.factory.js';

describe('createDefaultSettings — onboarding fields', () => {
  it('should return onboardingComplete as false', () => {
    const settings = createDefaultSettings();

    expect(settings.onboardingComplete).toBe(false);
  });

  it('should return workflow.approvalGateDefaults with all fields set to false', () => {
    const settings = createDefaultSettings();

    expect(settings.workflow.approvalGateDefaults).toEqual({
      allowPrd: false,
      allowPlan: false,
      allowMerge: false,
      pushOnImplementationComplete: false,
    });
  });

  it('should preserve existing workflow defaults alongside new approvalGateDefaults', () => {
    const settings = createDefaultSettings();

    expect(settings.workflow.openPrOnImplementationComplete).toBe(false);
    expect(settings.workflow.approvalGateDefaults).toBeDefined();
  });
});
