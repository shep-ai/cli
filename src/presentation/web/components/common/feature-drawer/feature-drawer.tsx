'use client';

import { XIcon, Loader2, Trash2, ExternalLink, GitCommitHorizontal } from 'lucide-react';
import { PrStatus } from '@shepai/core/domain/generated/output';
import { cn } from '@/lib/utils';
import { OpenActionMenu } from '@/components/common/open-action-menu';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CometSpinner } from '@/components/ui/comet-spinner';
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
import { CiStatusBadge } from '@/components/common/ci-status-badge';
import { featureNodeStateConfig, lifecycleDisplayLabels } from '@/components/common/feature-node';
import type { FeatureNodeData } from '@/components/common/feature-node';
import { useFeatureActions } from './use-feature-actions';

export interface FeatureDrawerProps {
  selectedNode: FeatureNodeData | null;
  onClose: () => void;
  onDelete?: (featureId: string) => void;
  isDeleting?: boolean;
}

export function FeatureDrawer({
  selectedNode,
  onClose,
  onDelete,
  isDeleting = false,
}: FeatureDrawerProps) {
  return (
    <Drawer
      direction="right"
      modal={false}
      handleOnly
      open={selectedNode !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DrawerContent direction="right" className="w-96" showCloseButton={false}>
        {selectedNode ? (
          <>
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
            <DrawerHeader data-testid="feature-drawer-header">
              <DrawerTitle>{selectedNode.name}</DrawerTitle>
              <DrawerDescription>{selectedNode.featureId}</DrawerDescription>
            </DrawerHeader>

            {/* Action buttons */}
            {selectedNode.repositoryPath && selectedNode.branch ? (
              <DrawerActions
                repositoryPath={selectedNode.repositoryPath}
                branch={selectedNode.branch}
                specPath={selectedNode.specPath}
              />
            ) : null}

            <Separator />

            {/* Status */}
            <div data-testid="feature-drawer-status" className="flex flex-col gap-3 p-4">
              <div className="text-muted-foreground text-xs font-semibold tracking-wider">
                {lifecycleDisplayLabels[selectedNode.lifecycle]}
              </div>

              <StateBadge data={selectedNode} />

              {selectedNode.progress > 0 ? (
                <div data-testid="feature-drawer-progress" className="flex flex-col gap-1">
                  <div className="text-muted-foreground flex items-center justify-between text-xs">
                    <span>Progress</span>
                    <span>{selectedNode.progress}%</span>
                  </div>
                  <div className="bg-muted h-2 w-full overflow-hidden rounded-full">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all',
                        featureNodeStateConfig[selectedNode.state].progressClass
                      )}
                      style={{ width: `${selectedNode.progress}%` }}
                    />
                  </div>
                </div>
              ) : null}
            </div>

            {/* PR info */}
            {selectedNode.pr ? (
              <>
                <Separator />
                <PrInfoSection pr={selectedNode.pr} />
              </>
            ) : null}

            <Separator />

            {/* Details */}
            <DetailsSection data={selectedNode} />

            {/* Delete action */}
            {onDelete ? (
              <>
                <Separator />
                <div data-testid="feature-drawer-delete" className="p-4">
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
                          This will permanently delete <strong>{selectedNode.name}</strong> (
                          {selectedNode.featureId}). This action cannot be undone.
                          {selectedNode.state === 'running' ? (
                            <> This feature has a running agent that will be stopped.</>
                          ) : null}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          variant="destructive"
                          disabled={isDeleting}
                          onClick={() => onDelete(selectedNode.featureId)}
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
          </>
        ) : null}
      </DrawerContent>
    </Drawer>
  );
}

function StateBadge({ data }: { data: FeatureNodeData }) {
  const config = featureNodeStateConfig[data.state];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium',
        config.badgeBgClass,
        config.badgeClass
      )}
    >
      {data.state === 'running' ? (
        <CometSpinner size="sm" className="shrink-0" />
      ) : (
        <Icon className="h-4 w-4 shrink-0" />
      )}
      <span>{config.label}</span>
    </div>
  );
}

function DetailsSection({ data }: { data: FeatureNodeData }) {
  const hasAnyDetail =
    data.description ?? data.agentType ?? data.runtime ?? data.blockedBy ?? data.errorMessage;

  if (!hasAnyDetail) return null;

  return (
    <div data-testid="feature-drawer-details" className="flex flex-col gap-3 p-4">
      {data.description ? <DetailRow label="Description" value={data.description} /> : null}
      {data.agentType ? <DetailRow label="Agent" value={data.agentType} /> : null}
      {data.runtime ? <DetailRow label="Runtime" value={data.runtime} /> : null}
      {data.blockedBy ? <DetailRow label="Blocked by" value={data.blockedBy} /> : null}
      {data.errorMessage ? <DetailRow label="Error" value={data.errorMessage} /> : null}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-muted-foreground text-xs font-medium">{label}</span>
      <span className="text-sm">{value}</span>
    </div>
  );
}

const prStatusStyles: Record<PrStatus, string> = {
  [PrStatus.Open]: 'border-transparent bg-blue-50 text-blue-700 hover:bg-blue-50',
  [PrStatus.Merged]: 'border-transparent bg-purple-50 text-purple-700 hover:bg-purple-50',
  [PrStatus.Closed]: 'border-transparent bg-red-50 text-red-700 hover:bg-red-50',
};

function PrInfoSection({ pr }: { pr: NonNullable<FeatureNodeData['pr']> }) {
  return (
    <div data-testid="feature-drawer-pr" className="border-border mx-4 rounded-lg border">
      <div className="space-y-3 px-4 py-3">
        {/* PR number + link */}
        <div className="flex items-center justify-between">
          <a
            href={pr.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary flex items-center gap-1.5 text-sm font-semibold underline underline-offset-2"
          >
            PR #{pr.number}
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
          <Badge className={prStatusStyles[pr.status]}>{pr.status}</Badge>
        </div>

        {/* CI status */}
        {pr.ciStatus ? (
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-xs font-medium">CI Status</span>
            <CiStatusBadge status={pr.ciStatus} />
          </div>
        ) : null}

        {/* Commit hash */}
        {pr.commitHash ? (
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-xs font-medium">Commit</span>
            <div className="flex items-center gap-1.5">
              <GitCommitHorizontal className="text-muted-foreground h-3.5 w-3.5" />
              <code className="bg-muted text-foreground rounded-md px-1.5 py-0.5 font-mono text-[11px]">
                {pr.commitHash.slice(0, 7)}
              </code>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function DrawerActions({
  repositoryPath,
  branch,
  specPath,
}: {
  repositoryPath: string;
  branch: string;
  specPath?: string;
}) {
  const actions = useFeatureActions({ repositoryPath, branch, specPath });

  return (
    <div className="flex gap-2 px-4 pb-3">
      <OpenActionMenu actions={actions} repositoryPath={repositoryPath} showSpecs={!!specPath} />
    </div>
  );
}
