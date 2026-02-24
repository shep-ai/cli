import type { TechDecision } from '@shepai/core/domain/generated/output';

export type { TechDecision };

export interface TechDecisionsReviewData {
  name: string;
  summary: string;
  decisions: TechDecision[];
  technologies: string[];
}

export interface TechDecisionsReviewProps {
  /** Tech decisions data from the research artifact */
  data: TechDecisionsReviewData;
  /** Approve plan callback */
  onApprove: () => void;
  /** Reject plan callback — opens feedback dialog when provided; also used for inline text rejection */
  onReject?: (feedback: string) => void;
  /** Controls disabled state during loading */
  isProcessing?: boolean;
  /** Whether a reject operation is in flight */
  isRejecting?: boolean;
}

export interface TechDecisionsDrawerProps extends Omit<TechDecisionsReviewProps, 'data'> {
  /** Tech decisions data — null while loading */
  data: TechDecisionsReviewData | null;
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
