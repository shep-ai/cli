import type { FeatureNodeData } from '@/components/common/feature-node';

const ELIGIBLE_PINNED_CONFIG_STATES = new Set<FeatureNodeData['state']>([
  'pending',
  'action-required',
  'error',
]);

export interface PinnedConfigSelection {
  agentType: NonNullable<FeatureNodeData['agentType']>;
  modelId: string;
}

export interface FeatureDrawerPinnedConfig {
  agentType: string;
  modelId: string;
  saving?: boolean;
  error?: string | null;
  onSave: (agentType: string, modelId: string) => Promise<{ ok: boolean; error?: string }>;
}

export function canSwitchPinnedConfig(state: FeatureNodeData['state']): boolean {
  return ELIGIBLE_PINNED_CONFIG_STATES.has(state);
}

export function getPinnedConfigSelection(
  node: Pick<FeatureNodeData, 'agentType' | 'modelId'> | null | undefined
): PinnedConfigSelection | null {
  if (!node?.agentType) {
    return null;
  }

  return {
    agentType: node.agentType,
    modelId: node.modelId ?? '',
  };
}
