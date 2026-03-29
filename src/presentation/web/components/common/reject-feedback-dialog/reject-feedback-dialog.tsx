'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
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

export function RejectFeedbackDialog({
  open,
  onOpenChange,
  onConfirm,
  isSubmitting,
  title,
  description,
}: RejectFeedbackDialogProps) {
  const { t } = useTranslation('web');
  const resolvedTitle = title ?? t('rejectFeedback.defaultTitle');
  const resolvedDescription = description ?? t('rejectFeedback.defaultDescription');
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
          <AlertDialogTitle>{resolvedTitle}</AlertDialogTitle>
          <AlertDialogDescription>{resolvedDescription}</AlertDialogDescription>
        </AlertDialogHeader>
        <Textarea
          aria-label={t('rejectFeedback.ariaLabel')}
          placeholder={t('rejectFeedback.placeholder')}
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          disabled={isSubmitting}
          rows={4}
          className="max-h-[35dvh] overflow-y-auto"
        />
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isSubmitting} onClick={() => onOpenChange(false)}>
            {t('rejectFeedback.cancel')}
          </AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={isFeedbackEmpty || isSubmitting}
            onClick={() => onConfirm(feedback.trim())}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="me-2 h-4 w-4 animate-spin" />
                {t('rejectFeedback.rejecting')}
              </>
            ) : (
              t('rejectFeedback.confirmReject')
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
