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
import { PrdQuestionnaire } from './prd-questionnaire';
import type { PrdQuestionnaireDrawerProps } from './prd-questionnaire-config';

export function PrdQuestionnaireDrawer({
  open,
  onClose,
  featureName,
  featureId,
  lifecycleLabel,
  onDelete,
  isDeleting,
  ...questionnaireProps
}: PrdQuestionnaireDrawerProps) {
  const { selections, data } = questionnaireProps;
  const answered = Object.keys(selections).length;
  const total = data.questions.length;
  const progress = total > 0 ? (answered / total) * 100 : 0;

  return (
    <Drawer
      direction="right"
      modal={false}
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose();
      }}
    >
      <DrawerContent direction="right" className="w-96" showCloseButton={false}>
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
          {featureId ? <DrawerDescription>{featureId}</DrawerDescription> : null}
        </DrawerHeader>

        {/* Status section */}
        <div className="flex flex-col gap-3 px-4 pb-3">
          {lifecycleLabel ? (
            <div className="text-muted-foreground text-xs font-semibold tracking-wider">
              {lifecycleLabel}
            </div>
          ) : null}
          <div className="flex flex-col gap-1">
            <div className="text-muted-foreground flex items-center justify-between text-xs">
              <span>Questions answered</span>
              <span>
                {answered}/{total}
              </span>
            </div>
            <div className="bg-muted h-2 w-full overflow-hidden rounded-full">
              <div
                className="bg-primary h-full rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>

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
