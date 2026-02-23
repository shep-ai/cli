import type { PrStatus, CiStatus } from '@shepai/core/domain/generated/output';

/** Diff summary statistics for the PR */
export interface MergeReviewDiffSummary {
  filesChanged: number;
  additions: number;
  deletions: number;
  commitCount: number;
}

/** PR metadata extracted from Feature.pr */
export interface MergeReviewPr {
  url: string;
  number: number;
  status: PrStatus;
  commitHash?: string;
  ciStatus?: CiStatus;
}

/** Data returned by the getMergeReviewData server action */
export interface MergeReviewData {
  /** PR metadata (always present when data is returned) */
  pr: MergeReviewPr;
  /** Aggregate diff statistics (omitted when worktree is unavailable) */
  diffSummary?: MergeReviewDiffSummary;
  /** Warning message when diff summary could not be retrieved */
  warning?: string;
}

/** Props for the merge review content component */
export interface MergeReviewProps {
  /** Merge review data from the server action */
  data: MergeReviewData;
  /** Approve merge callback */
  onApprove: () => void;
  /** Controls disabled state during approval */
  isProcessing?: boolean;
}

/** Props for the merge review drawer (shell wrapper) */
export interface MergeReviewDrawerProps extends MergeReviewProps {
  /** Whether the drawer is open */
  open: boolean;
  /** Callback when drawer should close */
  onClose: () => void;
  /** Feature name shown in drawer header */
  featureName: string;
  /** Feature ID shown below the name */
  featureId?: string;
  /** Absolute path to the repository on disk */
  repositoryPath?: string;
  /** Git branch name for this feature */
  branch?: string;
  /** Absolute path to the specs folder on disk */
  specPath?: string;
  /** Callback to delete the feature — shows delete button when provided */
  onDelete?: (featureId: string) => void;
  /** Whether a delete operation is in progress */
  isDeleting?: boolean;
}
