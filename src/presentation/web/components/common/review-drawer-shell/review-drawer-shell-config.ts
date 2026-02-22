import type { ReactNode } from 'react';

export interface ReviewDrawerShellProps {
  /** Whether the drawer is open */
  open: boolean;
  /** Callback when drawer should close */
  onClose: () => void;
  /** Feature name shown in drawer header */
  featureName: string;
  /** Short description shown below the feature name */
  featureDescription?: string;
  /** Feature ID shown below the name (sr-only) */
  featureId?: string;
  /** Absolute path to the repository on disk */
  repositoryPath?: string;
  /** Git branch name for this feature */
  branch?: string;
  /** Absolute path to the specs folder on disk */
  specPath?: string;
  /** Callback to delete the feature — shows inline delete button when provided */
  onDelete?: (featureId: string) => void;
  /** Drawer body content */
  children: ReactNode;
}
