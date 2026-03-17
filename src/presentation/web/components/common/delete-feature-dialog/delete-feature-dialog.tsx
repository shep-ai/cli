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
          <AlertDialogTitle>Delete feature?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete <strong>{featureName}</strong> ({featureId}). This action
            cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Checkbox
              id="cleanup-checkbox"
              checked={cleanup}
              onCheckedChange={(checked) => setCleanup(checked === true)}
              disabled={isDeleting}
              aria-label="Clean up worktree and branches"
            />
            <Label htmlFor="cleanup-checkbox" className="cursor-pointer text-sm">
              Clean up worktree and branches
            </Label>
          </div>
          {hasChildren ? (
            <div className="flex items-center gap-2">
              <Checkbox
                id="cascade-delete-checkbox"
                checked={cascadeDelete}
                onCheckedChange={(checked) => setCascadeDelete(checked === true)}
                disabled={isDeleting}
                aria-label="Delete sub-features"
              />
              <Label htmlFor="cascade-delete-checkbox" className="cursor-pointer text-sm">
                Delete sub-features
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
                aria-label="Close pull request"
              />
              <Label htmlFor="close-pr-checkbox" className="cursor-pointer text-sm">
                Close pull request
              </Label>
            </div>
          ) : null}
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting} onClick={() => onOpenChange(false)}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={isDeleting}
            onClick={() => onConfirm(cleanup, cascadeDelete, hasOpenPr ? closePr : false)}
          >
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting…
              </>
            ) : (
              'Delete'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
