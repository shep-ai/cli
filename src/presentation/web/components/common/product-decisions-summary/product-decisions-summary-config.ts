export interface ProductDecisionItem {
  /** Question text */
  question: string;
  /** The selected option label */
  selectedOption: string;
  /** Rationale for the selected option */
  rationale: string;
  /** Whether it was the AI-recommended option */
  wasRecommended: boolean;
}

export interface ProductDecisionsSummaryData {
  /** Goal/title from the PRD */
  question: string;
  /** Context description (one-liner) */
  context: string;
  /** Resolved questions with selected options */
  questions: ProductDecisionItem[];
}

export interface ProductDecisionsSummaryProps {
  /** Product decisions data from the feature artifact */
  data: ProductDecisionsSummaryData;
}
