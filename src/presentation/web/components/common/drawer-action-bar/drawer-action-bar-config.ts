import type { ReactNode } from 'react';

/** Attachment record for the reject form — mirrors FormAttachment from feature-create-drawer. */
export interface RejectAttachment {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  path: string;
  loading?: boolean;
}

export interface DrawerActionBarProps {
  /** Callback when user rejects with feedback (inline input or dialog) */
  onReject?: (feedback: string, attachments: RejectAttachment[]) => void;
  /** Callback when user approves */
  onApprove: () => void;
  /** Label for the approve button (used in both the split button and dropdown) */
  approveLabel: string;
  /** Visual variant for the approve action: 'default' (blue) or 'warning' (orange) */
  approveVariant?: 'default' | 'warning';
  /** Placeholder for the inline revision textarea */
  revisionPlaceholder?: string;
  /** Whether an approval/processing operation is in flight */
  isProcessing?: boolean;
  /** Whether a reject operation is in flight */
  isRejecting?: boolean;
  /** Content rendered between revision input and action buttons (e.g. progress bar) */
  children?: ReactNode;
  /** Controlled chat input value. When provided, component uses this instead of internal state. */
  chatInput?: string;
  /** Controlled chat input change handler. Required when chatInput is provided. */
  onChatInputChange?: (value: string) => void;
}
