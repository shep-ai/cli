import type { ApprovalGates, Feature } from '../../../../domain/generated/output.js';

export interface CreateFeatureInput {
  userInput: string;
  repositoryPath: string;
  approvalGates?: ApprovalGates;
  openPr?: boolean;
  autoMerge?: boolean;
}

export interface CreateFeatureResult {
  feature: Feature;
  warning?: string;
}

export interface FeatureMetadata {
  slug: string;
  name: string;
  description: string;
}
