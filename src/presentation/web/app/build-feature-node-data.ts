import type { Feature, AgentRun } from '@shepai/core/domain/generated/output';
import {
  deriveNodeState,
  deriveProgress,
} from '@/components/common/feature-node/derive-feature-state';
import type { FeatureNodeData, FeatureLifecyclePhase } from '@/components/common/feature-node';

/** Map domain SdlcLifecycle enum values to UI FeatureLifecyclePhase (1:1). */
const lifecycleMap: Record<string, FeatureLifecyclePhase> = {
  Requirements: 'requirements',
  Research: 'research',
  Implementation: 'implementation',
  Review: 'review',
  'Deploy & QA': 'deploy',
  Maintain: 'maintain',
};

/** Map agent graph node names (from agent_run.result) to UI lifecycle phases. */
const nodeToLifecyclePhase: Record<string, FeatureLifecyclePhase> = {
  analyze: 'requirements',
  requirements: 'requirements',
  research: 'research',
  plan: 'implementation',
  implement: 'implementation',
  merge: 'review',
};

/**
 * Builds a FeatureNodeData object from a Feature entity and optional AgentRun.
 * This is the single-feature version of the logic in `buildGraphNodes`.
 */
export function buildFeatureNodeData(feature: Feature, run: AgentRun | null): FeatureNodeData {
  const agentNode = run?.result?.startsWith('node:') ? run.result.slice(5) : undefined;
  const lifecycle: FeatureLifecyclePhase =
    run?.status === 'completed'
      ? 'maintain'
      : ((agentNode ? nodeToLifecyclePhase[agentNode] : undefined) ??
        lifecycleMap[feature.lifecycle] ??
        'requirements');

  return {
    name: feature.name,
    description: feature.description ?? feature.slug,
    featureId: feature.id,
    lifecycle,
    repositoryPath: feature.repositoryPath,
    branch: feature.branch,
    specPath: feature.specPath,
    state: deriveNodeState(feature, run),
    progress: deriveProgress(feature),
    ...(run?.agentType && { agentType: run.agentType as FeatureNodeData['agentType'] }),
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
