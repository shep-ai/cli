'use client';

import { Loader2, Trash2, XIcon } from 'lucide-react';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { OpenActionMenu } from '@/components/common/open-action-menu';
import { useFeatureActions } from '@/components/common/feature-drawer/use-feature-actions';
import type { ReviewDrawerShellProps } from './review-drawer-shell-config';

export function ReviewDrawerShell({
  open,
  onClose,
  featureName,
  featureId,
  repositoryPath,
  branch,
  specPath,
  onDelete,
  isDeleting,
  children,
}: ReviewDrawerShellProps) {
  const actionsInput = repositoryPath && branch ? { repositoryPath, branch, specPath } : null;
  const actions = useFeatureActions(actionsInput);

  return (
    <Drawer
      direction="right"
      modal={false}
      handleOnly
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose();
      }}
    >
      <DrawerContent direction="right" className="w-xl" showCloseButton={false}>
        {/* Close button */}
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="ring-offset-background focus:ring-ring absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden"
        >
          <XIcon className="size-4" />
        </button>

        {/* Header */}
        <DrawerHeader>
          <DrawerTitle>{featureName}</DrawerTitle>
          {featureId ? (
            <DrawerDescription className="sr-only">{featureId}</DrawerDescription>
          ) : null}
        </DrawerHeader>

        {/* Action menu + inline delete */}
        {actionsInput ? (
          <div className="flex items-center gap-2 px-4 pb-3">
            <OpenActionMenu
              actions={actions}
              repositoryPath={actionsInput.repositoryPath}
              showSpecs={!!specPath}
            />
            {onDelete && featureId ? (
              <>
                <div className="bg-border mx-1 h-4 w-px" />
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Delete feature"
                      disabled={isDeleting}
                      className="text-muted-foreground hover:text-destructive"
                      data-testid="review-drawer-delete"
                    >
                      {isDeleting ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Trash2 className="size-4" />
                      )}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete feature?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete <strong>{featureName}</strong> ({featureId}).
                        This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        variant="destructive"
                        disabled={isDeleting}
                        onClick={() => onDelete(featureId)}
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
              </>
            ) : null}
          </div>
        ) : null}

        <Separator />

        {/* Content slot */}
        <div className="flex min-h-0 flex-1 flex-col">{children}</div>
      </DrawerContent>
    </Drawer>
  );
}
