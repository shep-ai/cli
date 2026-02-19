import type {
  PrdOption,
  PrdQuestion,
  PrdFinalAction,
  PrdQuestionnaireData,
} from '@shepai/core/domain/generated/output';

export type { PrdOption, PrdQuestion, PrdFinalAction, PrdQuestionnaireData };

export interface PrdQuestionnaireProps {
  /** Header title text */
  question: string;
  /** Header context/description text */
  context: string;
  /** Array of questions to display */
  questions: PrdQuestion[];
  /** Map of questionId to selected optionId (controlled state) */
  selections: Record<string, string>;
  /** Configuration for the finalize/approve action button */
  finalAction: PrdFinalAction;
  /** Selection change callback */
  onSelect: (questionId: string, optionId: string) => void;
  /** Chat refinement submit callback */
  onRefine: (text: string) => void;
  /** Finalize requirements callback */
  onApprove: (actionId: string) => void;
  /** Controls disabled/animated state during refinement */
  isProcessing?: boolean;
}

export interface PrdQuestionnaireDrawerProps extends PrdQuestionnaireProps {
  /** Whether the drawer is open */
  open: boolean;
  /** Callback when drawer should close */
  onClose: () => void;
  /** Feature name shown in drawer header */
  featureName: string;
  /** Feature ID shown below the name */
  featureId?: string;
  /** Current lifecycle stage label */
  lifecycleLabel?: string;
}
