'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Trans, useTranslation } from 'react-i18next';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import type { DeleteFeatureDialogProps } from './delete-feature-dialog-config';

export function DeleteFeatureDialog({
  open,
  onOpenChange,
  onConfirm,
  isDeleting,
  featureName,
  featureId,
  hasChildren,
  hasOpenPr,
}: DeleteFeatureDialogProps) {
  const { t } = useTranslation('web');
  const [cleanup, setCleanup] = useState(true);
  const [cascadeDelete, setCascadeDelete] = useState(false);
  const [closePr, setClosePr] = useState(true);

  useEffect(() => {
    if (open) {
      setCleanup(true);
      setCascadeDelete(false);
      setClosePr(true);
    }
  }, [open]);

  useEffect(() => {
    if (cleanup) {
      setClosePr(true);
    } else {
      setClosePr(false);
    }
  }, [cleanup]);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent onCloseAutoFocus={(e) => e.preventDefault()}>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('deleteFeature.title')}</AlertDialogTitle>
          <AlertDialogDescription>
            <Trans
              t={t}
              i18nKey="deleteFeature.description"
              values={{ featureName, featureId }}
              components={{ strong: <strong /> }}
            />
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Checkbox
              id="cleanup-checkbox"
              checked={cleanup}
              onCheckedChange={(checked) => setCleanup(checked === true)}
              disabled={isDeleting}
              aria-label={t('deleteFeature.cleanupLabel')}
            />
            <Label htmlFor="cleanup-checkbox" className="cursor-pointer text-sm">
              {t('deleteFeature.cleanupLabel')}
            </Label>
          </div>
          {hasChildren ? (
            <div className="flex items-center gap-2">
              <Checkbox
                id="cascade-delete-checkbox"
                checked={cascadeDelete}
                onCheckedChange={(checked) => setCascadeDelete(checked === true)}
                disabled={isDeleting}
                aria-label={t('deleteFeature.deleteSubFeatures')}
              />
              <Label htmlFor="cascade-delete-checkbox" className="cursor-pointer text-sm">
                {t('deleteFeature.deleteSubFeatures')}
              </Label>
            </div>
          ) : null}
          {hasOpenPr ? (
            <div className="flex items-center gap-2">
              <Checkbox
                id="close-pr-checkbox"
                checked={closePr}
                onCheckedChange={(checked) => setClosePr(checked === true)}
                disabled={isDeleting || !cleanup}
                aria-label={t('deleteFeature.closePullRequest')}
              />
              <Label htmlFor="close-pr-checkbox" className="cursor-pointer text-sm">
                {t('deleteFeature.closePullRequest')}
              </Label>
            </div>
          ) : null}
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting} onClick={() => onOpenChange(false)}>
            {t('deleteFeature.cancel')}
          </AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={isDeleting}
            onClick={() => onConfirm(cleanup, cascadeDelete, hasOpenPr ? closePr : false)}
          >
            {isDeleting ? (
              <>
                <Loader2 className="me-2 h-4 w-4 animate-spin" />
                {t('deleteFeature.deleting')}
              </>
            ) : (
              t('deleteFeature.delete')
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
