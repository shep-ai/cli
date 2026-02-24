export interface RejectFeedbackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (feedback: string) => void;
  isSubmitting: boolean;
  title?: string;
  description?: string;
}
