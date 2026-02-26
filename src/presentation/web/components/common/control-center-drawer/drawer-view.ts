import type { FeatureNodeData } from '@/components/common/feature-node';
import type { RepositoryNodeData } from '@/components/common/repository-node';
import type { ParentFeatureOption } from '@/components/common/feature-create-drawer/feature-create-drawer';
import type { WorkflowDefaults } from '@/app/actions/get-workflow-defaults';

/**
 * Discriminated union representing every possible drawer state in the control center.
 * Only one view can be active at a time.
 */
export type DrawerView =
  /** Generic feature info (running, done, blocked, error, or unhandled action-required phases) */
  | { type: 'feature'; node: FeatureNodeData }
  /** requirements lifecycle + action-required → PRD questionnaire */
  | { type: 'prd-review'; node: FeatureNodeData }
  /** implementation lifecycle + action-required → tech decisions review */
  | { type: 'tech-review'; node: FeatureNodeData }
  /** review lifecycle + action-required|error → merge review */
  | { type: 'merge-review'; node: FeatureNodeData }
  /** Feature creation form */
  | {
      type: 'feature-create';
      repositoryPath: string;
      initialParentId?: string;
      features: ParentFeatureOption[];
      workflowDefaults?: WorkflowDefaults;
    }
  /** Repository node actions */
  | { type: 'repository'; data: RepositoryNodeData };

/**
 * Derives the active DrawerView from control-center state.
 * Priority: feature-create > selected-node (prd/tech/merge/feature) > repository
 */
export function computeDrawerView({
  selectedNode,
  isCreateDrawerOpen,
  pendingRepositoryPath,
  pendingParentFeatureId,
  selectedRepoNode,
  features,
  workflowDefaults,
}: {
  selectedNode: FeatureNodeData | null;
  isCreateDrawerOpen: boolean;
  pendingRepositoryPath: string;
  pendingParentFeatureId: string | undefined;
  selectedRepoNode: RepositoryNodeData | null;
  features: ParentFeatureOption[];
  workflowDefaults: WorkflowDefaults | undefined;
}): DrawerView | null {
  if (isCreateDrawerOpen) {
    return {
      type: 'feature-create',
      repositoryPath: pendingRepositoryPath,
      initialParentId: pendingParentFeatureId,
      features,
      workflowDefaults,
    };
  }

  if (selectedNode) {
    if (selectedNode.lifecycle === 'requirements' && selectedNode.state === 'action-required') {
      return { type: 'prd-review', node: selectedNode };
    }
    if (selectedNode.lifecycle === 'implementation' && selectedNode.state === 'action-required') {
      return { type: 'tech-review', node: selectedNode };
    }
    if (
      selectedNode.lifecycle === 'review' &&
      (selectedNode.state === 'action-required' || selectedNode.state === 'error')
    ) {
      return { type: 'merge-review', node: selectedNode };
    }
    return { type: 'feature', node: selectedNode };
  }

  if (selectedRepoNode) {
    return { type: 'repository', data: selectedRepoNode };
  }

  return null;
}
