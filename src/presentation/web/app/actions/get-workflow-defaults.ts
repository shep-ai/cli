'use server';

import { getSettings } from '@shepai/core/infrastructure/services/settings.service';

export interface WorkflowDefaults {
  approvalGates: {
    allowPrd: boolean;
    allowPlan: boolean;
    allowMerge: boolean;
  };
  push: boolean;
  openPr: boolean;
  ciWatchEnabled: boolean;
  enableEvidence: boolean;
  commitEvidence: boolean;
  fast: boolean;
  injectSkills: boolean;
}

export async function getWorkflowDefaults(): Promise<WorkflowDefaults> {
  const settings = getSettings();
  const { workflow } = settings;

  return {
    approvalGates: {
      allowPrd: workflow.approvalGateDefaults.allowPrd,
      allowPlan: workflow.approvalGateDefaults.allowPlan,
      allowMerge: workflow.approvalGateDefaults.allowMerge,
    },
    push: workflow.approvalGateDefaults.pushOnImplementationComplete,
    openPr: workflow.openPrOnImplementationComplete,
    ciWatchEnabled: workflow.ciWatchEnabled,
    enableEvidence: workflow.enableEvidence,
    commitEvidence: workflow.commitEvidence,
    fast: workflow.defaultFastMode,
    injectSkills: workflow.skillInjection?.enabled ?? false,
  };
}
