'use client';

import { Code2, FolderOpen, Loader2, Terminal, Trash2, XIcon } from 'lucide-react';
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
import { ActionButton } from '@/components/common/action-button';
import { useFeatureActions } from '@/components/common/feature-drawer/use-feature-actions';
import { PrdQuestionnaire } from './prd-questionnaire';
import type { PrdQuestionnaireDrawerProps } from './prd-questionnaire-config';

export function PrdQuestionnaireDrawer({
  open,
  onClose,
  featureName,
  featureId,
  repositoryPath,
  branch,
  specPath,
  onDelete,
  isDeleting,
  ...questionnaireProps
}: PrdQuestionnaireDrawerProps) {
  const actionsInput = repositoryPath && branch ? { repositoryPath, branch, specPath } : null;
  const {
    openInIde,
    openInShell,
    openSpecsFolder,
    ideLoading,
    shellLoading,
    specsLoading,
    ideError,
    shellError,
    specsError,
  } = useFeatureActions(actionsInput);

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

        {/* Action buttons */}
        {actionsInput ? (
          <div className="flex gap-2 px-4 pb-3">
            <ActionButton
              label="Open in IDE"
              onClick={openInIde}
              loading={ideLoading}
              error={!!ideError}
              icon={Code2}
            />
            <ActionButton
              label="Open in Shell"
              onClick={openInShell}
              loading={shellLoading}
              error={!!shellError}
              icon={Terminal}
            />
            {specPath ? (
              <ActionButton
                label="Open Specs"
                onClick={openSpecsFolder}
                loading={specsLoading}
                error={!!specsError}
                icon={FolderOpen}
              />
            ) : null}
          </div>
        ) : null}

        <Separator />

        {/* Questionnaire body */}
        <div className="flex min-h-0 flex-1 flex-col">
          <PrdQuestionnaire {...questionnaireProps} />
        </div>

        {/* Delete action */}
        {onDelete && featureId ? (
          <>
            <Separator />
            <div data-testid="prd-drawer-delete" className="p-4">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="w-full" disabled={isDeleting}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete feature
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
            </div>
          </>
        ) : null}
      </DrawerContent>
    </Drawer>
  );
}
