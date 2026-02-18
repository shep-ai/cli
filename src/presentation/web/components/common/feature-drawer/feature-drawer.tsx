'use client';

import { XIcon, Loader2, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from '@/components/ui/drawer';
import { Separator } from '@/components/ui/separator';
import { CometSpinner } from '@/components/ui/comet-spinner';
import { Button } from '@/components/ui/button';
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
import { featureNodeStateConfig, lifecycleDisplayLabels } from '@/components/common/feature-node';
import type { FeatureNodeData } from '@/components/common/feature-node';

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
    data.description ?? data.agentName ?? data.runtime ?? data.blockedBy ?? data.errorMessage;

  if (!hasAnyDetail) return null;

  return (
    <div data-testid="feature-drawer-details" className="flex flex-col gap-3 p-4">
      {data.description ? <DetailRow label="Description" value={data.description} /> : null}
      {data.agentName ? <DetailRow label="Agent" value={data.agentName} /> : null}
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
