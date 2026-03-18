import type { FeatureActionsState } from '@/components/common/feature-drawer/use-feature-actions';

export interface OpenActionMenuProps {
  /** Actions returned by useFeatureActions hook */
  actions: FeatureActionsState;
  /** Absolute path to copy to clipboard (worktree path preferred, falls back to repository path) */
  copyPath: string;
  /** Whether to show the "Open Specs" item */
  showSpecs?: boolean;
}
