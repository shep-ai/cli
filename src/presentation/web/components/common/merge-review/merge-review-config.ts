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

/** A phase from the implementation plan */
export interface MergeReviewPhase {
  id: string;
  name: string;
  description?: string;
}

/** Branch merge direction info */
export interface MergeReviewBranch {
  /** Feature branch name */
  source: string;
  /** Target branch name (e.g. 'main') */
  target: string;
}

/** Data returned by the getMergeReviewData server action */
export interface MergeReviewData {
  /** PR metadata (omitted when the feature has no PR) */
  pr?: MergeReviewPr;
  /** Aggregate diff statistics (omitted when worktree is unavailable) */
  diffSummary?: MergeReviewDiffSummary;
  /** Implementation phases from plan.yaml */
  phases?: MergeReviewPhase[];
  /** Branch merge direction */
  branch?: MergeReviewBranch;
  /** Warning message when diff summary could not be retrieved */
  warning?: string;
}

/** Props for the merge review content component */
export interface MergeReviewProps {
  /** Merge review data from the server action */
  data: MergeReviewData;
  /** Approve merge callback */
  onApprove: () => void;
  /** Reject merge callback — opens feedback dialog when provided; also used for inline text rejection */
  onReject?: (feedback: string) => void;
  /** Controls disabled state during approval */
  isProcessing?: boolean;
  /** Whether a reject operation is in flight */
  isRejecting?: boolean;
}

/** Props for the merge review drawer (shell wrapper) */
export interface MergeReviewDrawerProps extends Omit<MergeReviewProps, 'data'> {
  /** Merge review data — null while loading */
  data: MergeReviewData | null;
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
  /** Git branch name — passed to ReviewDrawerShell for actions */
  branch?: string;
  /** Absolute path to the specs folder on disk */
  specPath?: string;
  /** Callback to delete the feature — shows delete button when provided */
  onDelete?: (featureId: string) => void;
}
