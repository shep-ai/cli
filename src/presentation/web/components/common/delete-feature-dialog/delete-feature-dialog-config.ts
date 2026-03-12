export interface DeleteFeatureDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (cleanup: boolean, cascadeDelete: boolean) => void;
  isDeleting: boolean;
  featureName: string;
  featureId: string;
  hasChildren?: boolean;
}
