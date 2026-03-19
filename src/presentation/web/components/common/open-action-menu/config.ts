import type { FeatureActionsState } from '@/components/common/feature-drawer/use-feature-actions';

export interface OpenActionMenuProps {
  /** Actions returned by useFeatureActions hook */
  actions: FeatureActionsState;
  /** Absolute path to the repository */
  repositoryPath: string;
  /** Absolute path to the git worktree for this feature (preferred for copy) */
  worktreePath?: string;
  /** Whether to show the "Open Specs" item */
  showSpecs?: boolean;
}
