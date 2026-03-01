import type { TechDecisionsReviewData } from '@/components/common/tech-decisions-review';
import type { ProductDecisionsSummaryData } from '@/components/common/product-decisions-summary';

export interface TechReviewTabsProps {
  /** Tech decisions data from the research artifact */
  techData: TechDecisionsReviewData;
  /** Product decisions data — null while loading, undefined if unavailable */
  productData?: ProductDecisionsSummaryData | null;
  /** Approve plan callback */
  onApprove: () => void;
  /** Reject plan callback */
  onReject?: (feedback: string) => void;
  /** Controls disabled state during loading */
  isProcessing?: boolean;
  /** Whether a reject operation is in flight */
  isRejecting?: boolean;
}
