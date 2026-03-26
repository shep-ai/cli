'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Handle, Position } from '@xyflow/react';
import {
  Plus,
  Trash2,
  Zap,
  ClipboardList,
  Loader2,
  Globe,
  RotateCcw,
  Play,
  Square,
  Eye,
  Archive,
  ArchiveRestore,
  MessageSquare,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ActionButton } from '@/components/common/action-button/action-button';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ChatDotIndicator } from '@/components/features/chat/ChatDotIndicator';
import { useTurnStatus } from '@/hooks/turn-statuses-provider';
import { useDeployAction } from '@/hooks/use-deploy-action';
import { useFeatureFlags } from '@/hooks/feature-flags-context';
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
import { DeleteFeatureDialog } from '@/components/common/delete-feature-dialog';
import {
  featureNodeStateConfig,
  lifecycleRunningVerbs,
  lifecyclePhaseBadge,
} from './feature-node-state-config';
import type { FeatureNodeData } from './feature-node-state-config';
import { getAgentTypeIcon } from './agent-type-icons';
import { FeatureSessionsDropdown } from './feature-sessions-dropdown';

function AgentIcon({ agentType, className }: { agentType?: string; className?: string }) {
  const IconComponent = getAgentTypeIcon(agentType);
  return <IconComponent className={className} />;
}

function getBadgeIcon(data: FeatureNodeData): LucideIcon {
  const config = featureNodeStateConfig[data.state];
  return config.icon;
}

/** Short, friendly label for each action-required gate. */
function getActionRequiredLabel(data: FeatureNodeData): string {
  if (data.lifecycle === 'requirements') return 'Review Requirements';
  if (data.lifecycle === 'implementation') return 'Review Technical Plan';
  if (data.lifecycle === 'review') return 'Review Changes';
  return 'Review';
}

function getBadgeText(data: FeatureNodeData): string {
  const config = featureNodeStateConfig[data.state];
  switch (data.state) {
    case 'creating':
      return 'Creating...';
    case 'running':
      return lifecycleRunningVerbs[data.lifecycle];
    case 'done':
      return data.runtime ? `Completed in ${data.runtime}` : 'Completed';
    case 'blocked':
      return data.blockedBy ? `Waiting on ${data.blockedBy}` : 'Blocked';
    case 'pending':
      return 'Pending';
    case 'action-required':
      return getActionRequiredLabel(data);
    case 'error':
      return data.errorMessage ?? 'Something went wrong';
    default:
      return config.label;
  }
}

export function FeatureNode({
  data,
  selected,
}: {
  data: FeatureNodeData;
  selected?: boolean;
  [key: string]: unknown;
}) {
  const router = useRouter();
  const config = featureNodeStateConfig[data.state];
  const Icon = config.icon;
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [idCopied, setIdCopied] = useState(false);
  const [archiveConfirmOpen, setArchiveConfirmOpen] = useState(false);
  const featureFlags = useFeatureFlags();

  const chatTurnStatus = useTurnStatus(data.featureId);

  const deployTarget =
    featureFlags.envDeploy && data.repositoryPath && data.branch
      ? {
          targetId: data.featureId,
          targetType: 'feature' as const,
          repositoryPath: data.repositoryPath,
          branch: data.branch,
        }
      : null;
  const deployAction = useDeployAction(deployTarget);
  const isDeployActive = deployAction.status === 'Booting' || deployAction.status === 'Ready';
  const isDeployReady = deployAction.status === 'Ready';

  return (
    <div className="animate-in fade-in group relative duration-300">
      {data.showHandles ? (
        <Handle
          type="target"
          position={Position.Left}
          isConnectable={false}
          className="opacity-0!"
          style={{ top: 70 }}
        />
      ) : null}

      {/* Action buttons — centered as a group to the left of the node.
          Tooltip side convention: left-side buttons use side="left", right-side buttons use side="right". */}
      <div
        className="absolute top-0 bottom-0 -left-14 flex items-center justify-center pr-3 pl-4 opacity-0 transition-opacity group-hover:opacity-100"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col items-center gap-2">
          {/* Archive button */}
          {data.onArchive &&
          data.featureId &&
          data.state !== 'deleting' &&
          data.state !== 'archived' ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    aria-label="Archive feature"
                    data-testid="feature-node-archive-button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setArchiveConfirmOpen(true);
                    }}
                    className="bg-card text-muted-foreground flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border shadow-sm transition-colors hover:border-gray-500 hover:text-gray-600"
                  >
                    <Archive className="h-3.5 w-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="left">Archive feature</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : null}

          {/* Delete button */}
          {data.onDelete && data.featureId && data.state !== 'deleting' ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    aria-label="Delete feature"
                    data-testid="feature-node-delete-button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setConfirmOpen(true);
                    }}
                    className="bg-card text-muted-foreground hover:border-destructive hover:text-destructive flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border shadow-sm transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="left">Delete feature</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : null}

          {/* Unarchive button */}
          {data.onUnarchive && data.featureId && data.state === 'archived' ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    aria-label="Unarchive feature"
                    data-testid="feature-node-unarchive-button"
                    onClick={(e) => {
                      e.stopPropagation();
                      data.onUnarchive?.(data.featureId);
                    }}
                    className="bg-card text-muted-foreground hover:border-primary hover:text-primary flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border shadow-sm transition-colors"
                  >
                    <ArchiveRestore className="h-3.5 w-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="left">Unarchive feature</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : null}
        </div>
      </div>

      {/* Delete confirmation dialog */}
      {data.onDelete && data.featureId && data.state !== 'deleting' ? (
        <DeleteFeatureDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          onConfirm={(cleanup, cascadeDelete, closePr) => {
            setConfirmOpen(false);
            data.onDelete?.(data.featureId, cleanup, cascadeDelete, closePr);
          }}
          isDeleting={false}
          featureName={data.name ?? 'this feature'}
          featureId={data.featureId}
          hasChildren={data.hasChildren}
          hasOpenPr={!!data.pr && data.pr.status === 'Open'}
        />
      ) : null}

      {/* Archive confirmation dialog */}
      {data.onArchive &&
      data.featureId &&
      data.state !== 'deleting' &&
      data.state !== 'archived' ? (
        <AlertDialog open={archiveConfirmOpen} onOpenChange={setArchiveConfirmOpen}>
          <AlertDialogContent onCloseAutoFocus={(e) => e.preventDefault()}>
            <AlertDialogHeader>
              <AlertDialogTitle>Archive feature?</AlertDialogTitle>
              <AlertDialogDescription>
                <strong>{data.name}</strong> will be hidden from the canvas. You can unarchive it
                later to restore it.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setArchiveConfirmOpen(false)}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  setArchiveConfirmOpen(false);
                  data.onArchive?.(data.featureId);
                }}
              >
                Archive
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : null}

      <div
        data-testid="feature-node-card"
        aria-busy={data.state === 'creating' || data.state === 'deleting' ? 'true' : undefined}
        className={cn(
          'bg-card flex min-h-35 w-97 cursor-pointer flex-col rounded-lg border p-3 shadow-sm transition-[border-color] duration-200 dark:bg-neutral-800/80',
          data.state === 'action-required' &&
            'border-l-[3px] border-l-rose-400 dark:border-l-amber-500',
          data.state === 'action-required' &&
            selected &&
            'border-t-rose-400 border-r-rose-400 border-b-rose-400 dark:border-t-amber-500 dark:border-r-amber-500 dark:border-b-amber-500',
          selected &&
            data.state !== 'action-required' &&
            'border-blue-400 dark:border-amber-500/60',
          data.state === 'deleting' && 'opacity-60',
          data.state === 'archived' && 'opacity-50'
        )}
      >
        {/* Phase dot + label — absolute top-right corner (hidden during creation) */}
        {data.state !== 'creating' ? (
          <div className="absolute top-3 right-4">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span
                    data-testid="feature-node-phase-badge"
                    className="flex items-center gap-1.5"
                  >
                    <span className="text-muted-foreground text-[10px]">
                      {lifecyclePhaseBadge[data.lifecycle].tooltip}
                    </span>
                    <span
                      className={cn(
                        'h-1.5 w-1.5 -translate-y-px rounded-full',
                        lifecyclePhaseBadge[data.lifecycle].dot
                      )}
                    />
                  </span>
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-56">
                  <p className="font-semibold">{lifecyclePhaseBadge[data.lifecycle].tooltip}</p>
                  <p className="mt-1 text-xs leading-relaxed text-neutral-500">
                    {lifecyclePhaseBadge[data.lifecycle].description}
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        ) : null}

        {/* Agent icon + Name */}
        <div className="flex items-center gap-1.5 pr-24">
          {data.agentType ? (
            <AgentIcon agentType={data.agentType} className="h-4 w-4 shrink-0" />
          ) : null}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span data-testid="feature-node-fast-mode-badge" className="shrink-0">
                  {data.fastMode ? (
                    <Zap className="h-3.5 w-3.5 text-amber-500" />
                  ) : (
                    <ClipboardList className="h-3.5 w-3.5 text-indigo-500" />
                  )}
                </span>
              </TooltipTrigger>
              <TooltipContent side="top">
                {data.fastMode ? 'Fast Mode' : 'Spec Driven'}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <h3 className="min-w-0 truncate text-sm font-bold">{data.name}</h3>
        </div>

        {/* Description */}
        {data.description ? (
          <p
            data-testid="feature-node-description"
            className="text-muted-foreground mt-1 line-clamp-2 text-xs"
          >
            {data.description}
          </p>
        ) : null}

        {/* Bottom section — pushed to bottom for consistent card height */}
        <div className="mt-auto pt-2">
          {/* Feature ID — always visible, truncated, copiable */}
          {/* Progress bar (if applicable) */}
          {config.showProgressBar ? (
            <>
              <div className="text-muted-foreground flex items-center justify-end text-[10px]">
                <span>{data.progress}%</span>
              </div>
              <div
                data-testid="feature-node-progress-bar"
                className="bg-muted mt-1.5 h-1 w-full overflow-hidden rounded-full"
              >
                <div
                  className={cn('h-full rounded-full transition-all', config.progressClass)}
                  style={{ width: `${data.progress}%` }}
                />
              </div>
            </>
          ) : null}

          {/* Status text for blocked / error / pending (above bottom row) */}
          {!config.showProgressBar &&
          ![
            'deleting',
            'creating',
            'running',
            'done',
            'action-required',
            'pending',
            'blocked',
          ].includes(data.state) ? (
            <div
              data-testid="feature-node-badge"
              className="relative flex min-w-0 items-center gap-1.5 text-xs"
            >
              {(() => {
                const BadgeIcon = getBadgeIcon(data);
                return <BadgeIcon className={cn('h-3.5 w-3.5 shrink-0', config.badgeClass)} />;
              })()}
              <span
                className={cn('translate-y-px truncate text-[11px] font-medium', config.badgeClass)}
              >
                {getBadgeText(data)}
              </span>
            </div>
          ) : null}

          {/* Bottom row: ID | icons | run controls ... status/actions right */}
          <div
            className="mt-1.5 flex min-h-[26px] items-center justify-between gap-2"
            style={{ transform: 'translateY(1px)' }}
          >
            {/* Left: ID + icons + deploy controls */}
            <div className="flex min-w-0 items-center gap-1.5">
              {data.featureId ? (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        data-testid="feature-node-id"
                        className="nodrag text-muted-foreground/60 hover:text-muted-foreground flex shrink-0 cursor-pointer items-baseline gap-1 font-mono text-[10px] transition-colors active:scale-95"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigator.clipboard.writeText(data.featureId);
                          setIdCopied(true);
                          setTimeout(() => setIdCopied(false), 1500);
                        }}
                      >
                        {idCopied ? (
                          <span className="text-emerald-500">Copied!</span>
                        ) : (
                          data.featureId.slice(0, 6)
                        )}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top">Click to copy: {data.featureId}</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ) : null}
              {(data.worktreePath ?? data.repositoryPath) ? (
                <FeatureSessionsDropdown
                  repositoryPath={data.worktreePath ?? data.repositoryPath}
                />
              ) : null}
              {/* Chat button */}
              {data.state !== 'creating' && data.state !== 'deleting' && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="xs"
                        aria-label="Open chat"
                        data-testid="feature-node-chat-button"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/feature/${data.featureId}/chat`);
                        }}
                        className="nodrag relative cursor-pointer text-violet-500 hover:text-violet-600 dark:text-violet-400 dark:hover:text-violet-300"
                      >
                        <MessageSquare className="h-3 w-3" />
                        <ChatDotIndicator status={chatTurnStatus} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      <p className="text-xs">Chat with agent</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              {deployTarget && data.state !== 'deleting' && data.state !== 'creating' ? (
                <>
                  <span className="bg-border h-3 w-px shrink-0" />
                  {isDeployReady ? (
                    /* Ready: Globe + URL — Globe morphs to Stop on hover */
                    <span
                      className="group/deploy nodrag flex min-w-0 items-center gap-1.5"
                      data-testid="feature-node-deploy-button"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              aria-label="Stop Dev Server"
                              className="flex h-5 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors"
                              onClick={(e) => {
                                e.stopPropagation();
                                deployAction.stop();
                              }}
                            >
                              {deployAction.stopLoading ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin text-red-500" />
                              ) : (
                                <span className="relative h-3.5 w-3.5">
                                  <Globe className="absolute inset-0 h-3.5 w-3.5 text-green-600 transition-opacity duration-200 group-hover/deploy:opacity-0 dark:text-green-400" />
                                  <Square className="absolute inset-0 h-3.5 w-3.5 text-red-500 opacity-0 transition-opacity duration-200 group-hover/deploy:opacity-100 dark:text-red-400" />
                                </span>
                              )}
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="top">Stop Dev Server</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      {deployAction.url ? (
                        <a
                          href={deployAction.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          data-testid="feature-node-deployment-indicator"
                          className="nodrag min-w-0 truncate text-[10px] text-green-700 hover:underline dark:text-green-400"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {deployAction.url}
                        </a>
                      ) : null}
                    </span>
                  ) : isDeployActive ? (
                    /* Booting: Stop button + "Starting…" */
                    <span
                      className="nodrag flex min-w-0 items-center gap-1.5"
                      data-testid="feature-node-deploy-button"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              aria-label="Stop Dev Server"
                              className="flex h-5 shrink-0 cursor-pointer items-center justify-center rounded-full text-red-500 transition-colors hover:text-red-600 dark:text-red-400 dark:hover:text-red-300"
                              onClick={(e) => {
                                e.stopPropagation();
                                deployAction.stop();
                              }}
                            >
                              {deployAction.stopLoading ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Square className="h-3.5 w-3.5" />
                              )}
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="top">Stop Dev Server</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <span className="text-muted-foreground animate-pulse text-[10px]">
                        Starting…
                      </span>
                    </span>
                  ) : (
                    /* Idle / Error: Play or Retry button */
                    <>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span
                              className={cn(
                                'nodrag flex shrink-0 items-center',
                                !deployAction.deployError &&
                                  '[&_button]:text-green-600 [&_button]:hover:text-green-700 dark:[&_button]:text-green-400 dark:[&_button]:hover:text-green-300'
                              )}
                              data-testid="feature-node-deploy-button"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <ActionButton
                                label={deployAction.deployError ? 'Retry' : 'Start Dev Server'}
                                onClick={deployAction.deploy}
                                loading={deployAction.deployLoading}
                                error={false}
                                icon={deployAction.deployError ? RotateCcw : Play}
                                iconOnly
                                variant="ghost"
                                size="icon-xs"
                              />
                            </span>
                          </TooltipTrigger>
                          <TooltipContent side="top">
                            {deployAction.deployError ? 'Retry Dev Server' : 'Start Dev Server'}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      {deployAction.deployError ? (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="min-w-0 truncate text-[10px] text-red-500">
                                Failed
                              </span>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-64">
                              <p className="text-xs">{deployAction.deployError}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : null}
                    </>
                  )}
                </>
              ) : null}
            </div>

            {/* Right: in-progress status or action buttons */}
            {data.state === 'deleting' ? (
              <div className="flex items-center gap-1.5 text-xs">
                <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-gray-400" />
                <span className="text-muted-foreground">Deleting…</span>
              </div>
            ) : data.state === 'creating' ? (
              <div className="flex items-center gap-1.5 text-xs">
                <Icon className="h-3.5 w-3.5 shrink-0 animate-spin text-teal-600 dark:text-teal-400" />
                <span className="font-medium text-teal-600 dark:text-teal-400">
                  {getBadgeText(data)}
                </span>
              </div>
            ) : data.state === 'running' ? (
              <div className="flex items-center gap-1.5 text-xs">
                <Icon className="h-3.5 w-3.5 shrink-0 animate-spin text-teal-600 dark:text-teal-400" />
                <span className="font-medium text-teal-600 dark:text-teal-400">
                  {getBadgeText(data)}
                </span>
              </div>
            ) : data.state === 'action-required' ? (
              <Button
                variant="default"
                size="xs"
                aria-label={getActionRequiredLabel(data)}
                data-testid="feature-node-approve-button"
                // eslint-disable-next-line @typescript-eslint/no-empty-function -- click bubbles to card's onNodeClick
                onClick={() => {}}
                className="nodrag dark:bg-primary dark:text-primary-foreground dark:hover:bg-primary/90 cursor-pointer bg-neutral-900 text-[11px] text-white hover:bg-neutral-800"
              >
                <Eye className="h-3 w-3" />
                {getActionRequiredLabel(data)}
              </Button>
            ) : data.state === 'error' && data.onRetry ? (
              <Button
                variant="outline"
                size="xs"
                aria-label="Retry"
                data-testid="feature-node-retry-button"
                onClick={(e) => {
                  e.stopPropagation();
                  data.onRetry!(data.featureId);
                }}
                className="nodrag cursor-pointer text-[11px] font-medium"
              >
                <RotateCcw className="h-3 w-3" />
                Retry
              </Button>
            ) : data.state === 'blocked' ? (
              <div className="flex items-center gap-1.5 text-xs" data-testid="feature-node-badge">
                {(() => {
                  const BadgeIcon = getBadgeIcon(data);
                  return <BadgeIcon className={cn('h-3.5 w-3.5 shrink-0', config.badgeClass)} />;
                })()}
                <span className={cn('truncate text-[11px] font-medium', config.badgeClass)}>
                  {getBadgeText(data)}
                </span>
              </div>
            ) : data.state === 'done' ? (
              <div className="flex items-center gap-1.5 text-xs" data-testid="feature-node-badge">
                {(() => {
                  const BadgeIcon = getBadgeIcon(data);
                  return <BadgeIcon className={cn('h-3.5 w-3.5 shrink-0', config.badgeClass)} />;
                })()}
                <span className={cn('text-[11px] font-medium', config.badgeClass)}>
                  {getBadgeText(data)}
                </span>
              </div>
            ) : data.state === 'pending' && data.onStart ? (
              <Button
                variant="outline"
                size="xs"
                aria-label="Start"
                data-testid="feature-node-start-button"
                onClick={(e) => {
                  e.stopPropagation();
                  data.onStart!(data.featureId);
                }}
                className="nodrag cursor-pointer text-[11px] font-medium"
              >
                <Play className="h-3 w-3" />
                Start
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      {/* Source handle — action button rendered as detached handle child (hidden when deleting) */}
      {data.onAction && data.state !== 'deleting' ? (
        <Handle
          type="source"
          position={Position.Right}
          className="h-0! w-0! border-0! bg-transparent!"
          style={{ top: 70 }}
        >
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  aria-label="Add feature"
                  data-testid="feature-node-action-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    data.onAction?.();
                  }}
                  className="nodrag absolute top-1/2 left-1/2 flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-blue-500 text-white opacity-0 shadow-md transition-opacity group-hover:opacity-100 hover:bg-blue-600"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">Add feature</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </Handle>
      ) : data.showHandles ? (
        <Handle
          type="source"
          position={Position.Right}
          isConnectable={false}
          className="opacity-0!"
          style={{ top: 70 }}
        />
      ) : null}
    </div>
  );
}
