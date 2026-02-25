import type { FeatureActionsState } from '@/components/common/feature-drawer/use-feature-actions';

export interface OpenActionMenuProps {
  /** Actions returned by useFeatureActions hook */
  actions: FeatureActionsState;
  /** Absolute path to copy (repository path or spec path) */
  repositoryPath: string;
  /** Whether to show the "Open Specs" item */
  showSpecs?: boolean;
}
