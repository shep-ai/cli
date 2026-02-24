import type { ApprovalGates, Feature } from '../../../../domain/generated/output.js';

export interface CreateFeatureInput {
  userInput: string;
  repositoryPath: string;
  approvalGates?: ApprovalGates;
  push?: boolean;
  openPr?: boolean;
  /** Optional ID of the parent feature. When set, child may be created in Blocked state. */
  parentId?: string;
}

export interface CreateFeatureResult {
  feature: Feature;
  warning?: string;
}
