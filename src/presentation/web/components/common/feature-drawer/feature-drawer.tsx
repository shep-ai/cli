'use client';

import { useState, useEffect } from 'react';
import { XIcon, Code2, Terminal, Loader2, CircleAlert, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { CometSpinner } from '@/components/ui/comet-spinner';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
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
import { useFeatureActions } from './use-feature-actions';

/** Lightweight shape of the spec data returned by /api/features/[id]/spec */
interface SpecData {
  summary?: string;
  content?: string;
  openQuestions?: {
    question: string;
    resolved: boolean;
    answer?: string;
  }[];
}

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

            {/* Action buttons */}
            {selectedNode.repositoryPath && selectedNode.branch ? (
              <DrawerActions
                repositoryPath={selectedNode.repositoryPath}
                branch={selectedNode.branch}
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

            <Separator />

            {/* PRD Spec (only when action-required + requirements) */}
            <PrdSection featureId={selectedNode.featureId} selectedNode={selectedNode} />

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

function PrdSection({
  featureId,
  selectedNode,
}: {
  featureId: string;
  selectedNode: FeatureNodeData;
}) {
  const [specData, setSpecData] = useState<SpecData | null>(null);
  const [loading, setLoading] = useState(false);

  const shouldShow =
    selectedNode.state === 'action-required' && selectedNode.lifecycle === 'requirements';

  useEffect(() => {
    if (!shouldShow || !featureId) {
      setSpecData(null);
      return;
    }

    const controller = new AbortController();
    setLoading(true);

    fetch(`/api/features/${encodeURIComponent(featureId)}/spec`, {
      signal: controller.signal,
    })
      .then((res) => {
        if (!res.ok) throw new Error('Not found');
        return res.json();
      })
      .then((data: SpecData) => {
        if (!controller.signal.aborted) {
          setSpecData(data);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setSpecData(null);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => {
      controller.abort();
    };
  }, [shouldShow, featureId]);

  if (!shouldShow) return null;

  if (loading) {
    return (
      <>
        <div data-testid="feature-drawer-prd" className="flex items-center justify-center p-4">
          <Loader2 className="text-muted-foreground h-5 w-5 animate-spin" />
        </div>
        <Separator />
      </>
    );
  }

  if (!specData) return null;

  return (
    <>
      <div data-testid="feature-drawer-prd" className="flex flex-col gap-3 p-4">
        <span className="text-muted-foreground text-xs font-semibold tracking-wider">PRD Spec</span>

        {specData.summary ? <p className="text-sm">{specData.summary}</p> : null}

        {specData.openQuestions && specData.openQuestions.length > 0 ? (
          <div className="flex flex-col gap-2">
            <span className="text-muted-foreground text-xs font-medium">Open Questions</span>
            <ul className="flex flex-col gap-1.5">
              {specData.openQuestions.map((q) => (
                <li key={q.question} className="flex flex-col gap-1">
                  <div className="flex items-start gap-2">
                    <Badge
                      className={cn(
                        'mt-0.5 shrink-0',
                        q.resolved
                          ? 'border-transparent bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : 'border-transparent bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200'
                      )}
                    >
                      {q.resolved ? 'Resolved' : 'Open'}
                    </Badge>
                    <span className="text-sm">{q.question}</span>
                  </div>
                  {q.resolved && q.answer ? (
                    <span className="text-muted-foreground ml-[4.5rem] text-xs">{q.answer}</span>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {specData.content ? (
          <div className="flex flex-col gap-1">
            <span className="text-muted-foreground text-xs font-medium">Content</span>
            <ScrollArea className="max-h-[400px]">
              <pre className="text-muted-foreground text-xs leading-relaxed whitespace-pre-wrap">
                {specData.content}
              </pre>
            </ScrollArea>
          </div>
        ) : null}
      </div>
      <Separator />
    </>
  );
}

function DrawerActions({ repositoryPath, branch }: { repositoryPath: string; branch: string }) {
  const { openInIde, openInShell, ideLoading, shellLoading, ideError, shellError } =
    useFeatureActions({ repositoryPath, branch });

  return (
    <div className="flex gap-2 px-4 pb-3">
      <DrawerActionButton
        label="Open in IDE"
        onClick={openInIde}
        loading={ideLoading}
        error={!!ideError}
        icon={Code2}
      />
      <DrawerActionButton
        label="Open in Shell"
        onClick={openInShell}
        loading={shellLoading}
        error={!!shellError}
        icon={Terminal}
      />
    </div>
  );
}

function DrawerActionButton({
  label,
  onClick,
  loading,
  error,
  icon: Icon,
}: {
  label: string;
  onClick: () => void;
  loading: boolean;
  error: boolean;
  icon: typeof Code2;
}) {
  return (
    <Button
      variant="outline"
      size="sm"
      aria-label={label}
      disabled={loading}
      onClick={onClick}
      className={cn('gap-1.5', error && 'text-destructive hover:text-destructive')}
    >
      {loading ? (
        <Loader2 className="size-4 animate-spin" />
      ) : error ? (
        <CircleAlert className="size-4" />
      ) : (
        <Icon className="size-4" />
      )}
      {label}
    </Button>
  );
}
