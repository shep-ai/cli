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
  /** Chat refinement callback — sends user feedback to the agent */
  onRefine: (text: string) => void;
  /** Approve plan callback */
  onApprove: () => void;
  /** Controls disabled state during loading */
  isProcessing?: boolean;
}

export interface TechDecisionsDrawerProps extends TechDecisionsReviewProps {
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
