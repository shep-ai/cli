import type { ReactNode } from 'react';

export interface DrawerActionBarProps {
  /** Callback when user rejects with feedback (inline input or dialog) */
  onReject?: (feedback: string) => void;
  /** Callback when user approves */
  onApprove: () => void;
  /** Label for the approve button */
  approveLabel: string;
  /** Icon element for the approve button */
  approveIcon?: ReactNode;
  /** Placeholder for the inline revision input */
  revisionPlaceholder?: string;
  /** Whether an approval/processing operation is in flight */
  isProcessing?: boolean;
  /** Whether a reject operation is in flight */
  isRejecting?: boolean;
  /** Content rendered between revision input and action buttons (e.g. progress bar) */
  children?: ReactNode;
}
