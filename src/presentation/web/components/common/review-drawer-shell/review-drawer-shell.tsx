'use client';

import { Loader2, Trash2 } from 'lucide-react';
import { BaseDrawer } from '@/components/common/base-drawer';
import { DrawerTitle, DrawerDescription } from '@/components/ui/drawer';
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
  featureDescription,
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
    <BaseDrawer
      open={open}
      onClose={onClose}
      size="md"
      modal={false}
      data-testid="review-drawer"
      deployTarget={
        featureId && repositoryPath && branch
          ? {
              targetId: featureId,
              targetType: 'feature',
              repositoryPath,
              branch,
            }
          : undefined
      }
      header={
        <>
          <div data-testid="feature-drawer-header">
            <DrawerTitle>{featureName}</DrawerTitle>
            {featureDescription ? (
              <DrawerDescription>{featureDescription}</DrawerDescription>
            ) : featureId ? (
              <DrawerDescription className="sr-only">{featureId}</DrawerDescription>
            ) : null}
          </div>

          {/* Action menu + inline delete */}
          {actionsInput ? (
            <div className="flex items-center gap-2 pt-2">
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
        </>
      }
    >
      <Separator />

      {/* Content slot */}
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
    </BaseDrawer>
  );
}
