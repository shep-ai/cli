export interface DeleteFeatureDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (cleanup: boolean) => void;
  isDeleting: boolean;
  featureName: string;
  featureId: string;
}
