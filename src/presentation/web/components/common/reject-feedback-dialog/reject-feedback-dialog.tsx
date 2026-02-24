'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import type { RejectFeedbackDialogProps } from './reject-feedback-dialog-config';

const DEFAULT_TITLE = 'Reject Requirements';
const DEFAULT_DESCRIPTION =
  'Provide feedback for the agent to address in the next iteration. Feedback is required.';

export function RejectFeedbackDialog({
  open,
  onOpenChange,
  onConfirm,
  isSubmitting,
  title = DEFAULT_TITLE,
  description = DEFAULT_DESCRIPTION,
}: RejectFeedbackDialogProps) {
  const [feedback, setFeedback] = useState('');

  // Reset feedback when dialog opens
  useEffect(() => {
    if (open) {
      setFeedback('');
    }
  }, [open]);

  const isFeedbackEmpty = feedback.trim().length === 0;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <Textarea
          aria-label="Rejection feedback"
          placeholder="Describe what needs to change..."
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          disabled={isSubmitting}
          rows={4}
        />
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isSubmitting} onClick={() => onOpenChange(false)}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={isFeedbackEmpty || isSubmitting}
            onClick={() => onConfirm(feedback.trim())}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Rejecting…
              </>
            ) : (
              'Confirm Reject'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
