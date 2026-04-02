// @vitest-environment node

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetSettings = vi.fn();
vi.mock('@shepai/core/infrastructure/services/settings.service', () => ({
  getSettings: mockGetSettings,
}));

const { getWorkflowDefaults } = await import(
  '../../../../../src/presentation/web/app/actions/get-workflow-defaults.js'
);

describe('getWorkflowDefaults server action', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('maps workflow settings to drawer defaults', async () => {
    mockGetSettings.mockReturnValue({
      workflow: {
        openPrOnImplementationComplete: true,
        defaultMode: 'Fast',
        ciWatchEnabled: true,
        enableEvidence: false,
        commitEvidence: false,
        approvalGateDefaults: {
          allowPrd: true,
          allowPlan: false,
          allowMerge: true,
          pushOnImplementationComplete: true,
        },
      },
    });

    const result = await getWorkflowDefaults();

    expect(result).toEqual({
      approvalGates: {
        allowPrd: true,
        allowPlan: false,
        allowMerge: true,
      },
      push: true,
      openPr: true,
      ciWatchEnabled: true,
      enableEvidence: false,
      commitEvidence: false,
      defaultMode: 'Fast',
    });
  });

  it('returns Regular mode when defaultMode is Regular', async () => {
    mockGetSettings.mockReturnValue({
      workflow: {
        openPrOnImplementationComplete: false,
        defaultMode: 'Regular',
        ciWatchEnabled: false,
        enableEvidence: false,
        commitEvidence: false,
        approvalGateDefaults: {
          allowPrd: false,
          allowPlan: false,
          allowMerge: false,
          pushOnImplementationComplete: false,
        },
      },
    });

    const result = await getWorkflowDefaults();

    expect(result).toEqual({
      approvalGates: {
        allowPrd: false,
        allowPlan: false,
        allowMerge: false,
      },
      push: false,
      openPr: false,
      ciWatchEnabled: false,
      enableEvidence: false,
      commitEvidence: false,
      defaultMode: 'Regular',
    });
  });

  it('maps pushOnImplementationComplete to push field', async () => {
    mockGetSettings.mockReturnValue({
      workflow: {
        openPrOnImplementationComplete: false,
        approvalGateDefaults: {
          allowPrd: false,
          allowPlan: false,
          allowMerge: false,
          pushOnImplementationComplete: true,
        },
      },
    });

    const result = await getWorkflowDefaults();

    expect(result.push).toBe(true);
    expect(result.openPr).toBe(false);
  });

  it('maps openPrOnImplementationComplete to openPr field', async () => {
    mockGetSettings.mockReturnValue({
      workflow: {
        openPrOnImplementationComplete: true,
        approvalGateDefaults: {
          allowPrd: false,
          allowPlan: false,
          allowMerge: false,
          pushOnImplementationComplete: false,
        },
      },
    });

    const result = await getWorkflowDefaults();

    expect(result.push).toBe(false);
    expect(result.openPr).toBe(true);
  });
});
