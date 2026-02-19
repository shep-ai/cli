import type { ApprovalGates, Feature } from '../../../../domain/generated/output.js';

export interface CreateFeatureInput {
  userInput: string;
  repositoryPath: string;
  approvalGates?: ApprovalGates;
  push?: boolean;
  openPr?: boolean;
}

export interface CreateFeatureResult {
  feature: Feature;
  warning?: string;
}
