import type { Feature, AgentRun } from '@shepai/core/domain/generated/output';
import {
  deriveNodeState,
  deriveProgress,
  deriveLifecycle,
} from '@/components/common/feature-node/derive-feature-state';
import type { FeatureNodeData } from '@/components/common/feature-node';

export interface BuildFeatureNodeDataOptions {
  baseBranch?: string;
  repositoryName?: string;
  /** AI-generated one-liner from FeatureArtifact */
  oneLiner?: string;
  /** Remote URL for the repository (HTTPS) */
  remoteUrl?: string;
}

/**
 * Builds a FeatureNodeData object from a Feature entity and optional AgentRun.
 * This is the single-feature version of the logic in `buildGraphNodes`.
 */
export function buildFeatureNodeData(
  feature: Feature,
  run: AgentRun | null,
  options?: BuildFeatureNodeDataOptions
): FeatureNodeData {
  return {
    name: feature.name,
    description: feature.description ?? feature.slug,
    featureId: feature.id,
    lifecycle: deriveLifecycle(feature, run),
    repositoryPath: feature.repositoryPath,
    branch: feature.branch,
    specPath: feature.specPath,
    state: deriveNodeState(feature, run),
    progress: deriveProgress(feature),
    summary: feature.description,
    userQuery: feature.userQuery,
    createdAt: feature.createdAt instanceof Date ? feature.createdAt.getTime() : feature.createdAt,
    ...(options?.repositoryName && { repositoryName: options.repositoryName }),
    ...(options?.baseBranch && { baseBranch: options.baseBranch }),
    ...(options?.oneLiner && { oneLiner: options.oneLiner }),
    ...(options?.remoteUrl && { remoteUrl: options.remoteUrl }),
    ...(run?.agentType && { agentType: run.agentType as FeatureNodeData['agentType'] }),
    ...(run?.modelId && { modelId: run.modelId }),
    ...(run?.error && { errorMessage: run.error }),
    ...(feature.pr && {
      pr: {
        url: feature.pr.url,
        number: feature.pr.number,
        status: feature.pr.status,
        ciStatus: feature.pr.ciStatus,
        commitHash: feature.pr.commitHash,
      },
    }),
  };
}
