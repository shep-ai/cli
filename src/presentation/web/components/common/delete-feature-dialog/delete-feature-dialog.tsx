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
}: DeleteFeatureDialogProps) {
  const [cleanup, setCleanup] = useState(true);
  const [cascadeDelete, setCascadeDelete] = useState(true);

  useEffect(() => {
    if (open) {
      setCleanup(true);
      setCascadeDelete(true);
    }
  }, [open]);

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
          {hasChildren ? (
            <div className="flex items-center gap-2">
              <Checkbox
                id="cascade-delete-checkbox"
                checked={cascadeDelete}
                onCheckedChange={(checked) => setCascadeDelete(checked === true)}
                disabled={isDeleting}
                aria-label="Also delete sub-features"
              />
              <Label htmlFor="cascade-delete-checkbox" className="cursor-pointer text-sm">
                Also delete sub-features
              </Label>
            </div>
          ) : null}
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
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting} onClick={() => onOpenChange(false)}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={isDeleting}
            onClick={() => onConfirm(cleanup, cascadeDelete)}
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
