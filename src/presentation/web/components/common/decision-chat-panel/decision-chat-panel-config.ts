import type { ReactNode } from 'react';

export interface DecisionChatPanelProps {
  /** Feature ID for scoping chat state */
  featureId: string;
  /** Review type — determines the chat context and prompt */
  reviewType: 'tech' | 'prd';
  /** Review data to send as context with each chat message */
  reviewContext: Record<string, unknown>;
  /** Callback when user approves */
  onApprove: () => void;
  /** Callback when user rejects with feedback */
  onReject?: (feedback: string) => void;
  /** Label for the approve button */
  approveLabel: string;
  /** Icon element for the approve button */
  approveIcon?: ReactNode;
  /** Whether an approval/processing operation is in flight */
  isProcessing?: boolean;
  /** Whether a reject operation is in flight */
  isRejecting?: boolean;
  /** Content rendered between message list and input (e.g. progress bar) */
  children?: ReactNode;
}
