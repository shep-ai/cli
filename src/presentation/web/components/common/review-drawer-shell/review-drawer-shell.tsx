'use client';

import { Loader2, Trash2, Play, Square } from 'lucide-react';
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { OpenActionMenu } from '@/components/common/open-action-menu';
import { ActionButton } from '@/components/common/action-button';
import { useFeatureActions } from '@/components/common/feature-drawer/use-feature-actions';
import { useDeployAction } from '@/hooks/use-deploy-action';
import { featureFlags } from '@/lib/feature-flags';
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

  const deployTargetInput =
    featureId && repositoryPath && branch
      ? { targetId: featureId, targetType: 'feature' as const, repositoryPath, branch }
      : null;
  const deployAction = useDeployAction(deployTargetInput);
  const isDeploymentActive = deployAction.status === 'Booting' || deployAction.status === 'Ready';

  return (
    <BaseDrawer
      open={open}
      onClose={onClose}
      size="md"
      modal={false}
      data-testid="review-drawer"
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

          {/* Action row: Open | Deploy → Delete (right-aligned) */}
          {actionsInput ? (
            <div className="flex items-center gap-2 pt-2">
              <OpenActionMenu
                actions={actions}
                repositoryPath={actionsInput.repositoryPath}
                showSpecs={!!specPath}
              />
              {featureFlags.envDeploy && deployTargetInput ? (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span>
                        <ActionButton
                          label={isDeploymentActive ? 'Stop Dev Server' : 'Start Dev Server'}
                          onClick={isDeploymentActive ? deployAction.stop : deployAction.deploy}
                          loading={deployAction.deployLoading || deployAction.stopLoading}
                          error={!!deployAction.deployError}
                          icon={isDeploymentActive ? Square : Play}
                          iconOnly
                          variant="outline"
                          size="icon-sm"
                        />
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      {isDeploymentActive ? 'Stop Dev Server' : 'Start Dev Server'}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ) : null}
              {onDelete && featureId ? (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Delete feature"
                      disabled={isDeleting}
                      className="text-muted-foreground hover:text-destructive ml-auto"
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
