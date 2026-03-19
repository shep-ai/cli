'use client';

import { useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import {
  Plus,
  Trash2,
  Zap,
  Loader2,
  Globe,
  RotateCcw,
  Play,
  Eye,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { DeleteFeatureDialog } from '@/components/common/delete-feature-dialog';
import {
  featureNodeStateConfig,
  lifecycleDisplayLabels,
  lifecycleRunningVerbs,
  lifecyclePhaseBadge,
} from './feature-node-state-config';
import type { FeatureNodeData } from './feature-node-state-config';
import { getAgentTypeIcon } from './agent-type-icons';
import { DeploymentState } from '@shepai/core/domain/generated/output';
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
  const config = featureNodeStateConfig[data.state];
  const Icon = config.icon;
  const [confirmOpen, setConfirmOpen] = useState(false);

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

      {/* Delete button — visible on hover, positioned to the left (hidden when deleting) */}
      {data.onDelete && data.featureId && data.state !== 'deleting' ? (
        <>
          <div
            className="absolute top-1/2 -left-10 -translate-y-1/2 opacity-0 transition-opacity group-hover:opacity-100"
            onPointerDown={(e) => e.stopPropagation()}
          >
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
                <TooltipContent>Delete feature</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

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
        </>
      ) : null}

      <div
        data-testid="feature-node-card"
        aria-busy={data.state === 'creating' || data.state === 'deleting' ? 'true' : undefined}
        className={cn(
          'bg-card flex min-h-35 w-97 cursor-pointer flex-col rounded-lg border p-3 shadow-sm',
          selected && 'ring-primary ring-2',
          data.state === 'deleting' && 'opacity-60'
        )}
      >
        {/* Phase dot + label — absolute top-right corner */}
        <div className="absolute top-3 right-4">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span
                  data-testid="feature-node-phase-badge"
                  className="flex items-center gap-1"
                >
                  <span className={cn('h-1.5 w-1.5 -translate-y-px rounded-full', lifecyclePhaseBadge[data.lifecycle].dot)} />
                  <span className="text-muted-foreground text-[10px]">
                    {lifecyclePhaseBadge[data.lifecycle].tooltip}
                  </span>
                </span>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-56">
                <p className="font-semibold">{lifecyclePhaseBadge[data.lifecycle].tooltip}</p>
                <p className="text-muted-foreground mt-1 text-xs leading-relaxed">{lifecyclePhaseBadge[data.lifecycle].description}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Agent icon + Name */}
        <div className="flex items-center gap-1.5">
          {data.agentType ? (
            <AgentIcon agentType={data.agentType} className="h-4 w-4 shrink-0" />
          ) : null}
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
          {!config.showProgressBar && !['deleting', 'creating', 'running', 'done', 'action-required'].includes(data.state) ? (
            <div
              data-testid="feature-node-badge"
              className="relative flex min-w-0 items-center gap-1.5 text-xs"
            >
              {(() => {
                const BadgeIcon = getBadgeIcon(data);
                return (
                  <BadgeIcon
                    className={cn('h-3.5 w-3.5 shrink-0', config.badgeClass)}
                  />
                );
              })()}
              <span className={cn('translate-y-px truncate text-[11px] font-medium', config.badgeClass)}>
                {getBadgeText(data)}
              </span>
            </div>
          ) : null}

          {/* Bottom row: Phase + ID ... right-side content */}
          <div className="mt-1.5 flex min-h-[26px] items-center justify-between gap-2">
            {/* Left: Agent icons + ID */}
            <div className="flex items-center gap-1.5" style={{ transform: 'translateY(1px)' }}>
              {data.featureId ? (
                <div className="flex items-baseline gap-1">
                  <span className="text-muted-foreground/50 text-[10px]">ID</span>
                  <button
                    type="button"
                    data-testid="feature-node-id"
                    className="nodrag text-muted-foreground/60 hover:text-muted-foreground cursor-pointer font-mono text-[10px] transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigator.clipboard.writeText(data.featureId);
                    }}
                    title={`Click to copy: ${data.featureId}`}
                  >
                    {data.featureId.slice(0, 6)}
                  </button>
                </div>
              ) : null}
              {data.deployment ? (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        aria-label={
                          data.deployment.status === DeploymentState.Booting
                            ? 'Deploying'
                            : 'Open dev server'
                        }
                        data-testid="feature-node-deployment-indicator"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (
                            data.deployment?.status === DeploymentState.Ready &&
                            data.deployment.url
                          ) {
                            window.open(data.deployment.url, '_blank', 'noopener,noreferrer');
                          }
                        }}
                        className={cn(
                          'nodrag',
                          data.deployment.status === DeploymentState.Ready && data.deployment.url
                            ? 'cursor-pointer opacity-80 transition-opacity hover:opacity-100'
                            : 'cursor-default'
                        )}
                      >
                        {data.deployment.status === DeploymentState.Booting ? (
                          <Loader2 className="h-3 w-3 animate-spin text-blue-500" />
                        ) : (
                          <Globe className="h-3 w-3 text-green-600" />
                        )}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      {data.deployment.status === DeploymentState.Booting
                        ? 'Deploying...'
                        : (data.deployment.url ?? 'Live')}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ) : null}
              {data.fastMode ? (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span data-testid="feature-node-fast-mode-badge">
                        <Zap className="h-3 w-3 text-amber-500" />
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="top">Fast Mode</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
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
                <Icon className="h-3.5 w-3.5 shrink-0 animate-spin" />
                <span className="text-muted-foreground">{getBadgeText(data)}</span>
              </div>
            ) : data.state === 'running' ? (
              <div className="flex items-center gap-1.5 text-xs">
                <Icon className="h-3.5 w-3.5 shrink-0 animate-spin" />
                <span className="text-muted-foreground">{getBadgeText(data)}</span>
              </div>
            ) : data.state === 'action-required' ? (
              <button
                type="button"
                aria-label={getActionRequiredLabel(data)}
                data-testid="feature-node-approve-button"
                onClick={(e) => {
                  e.stopPropagation();
                }}
                className="nodrag relative inline-flex shrink-0 cursor-pointer items-center gap-1.5 overflow-hidden rounded-md bg-gradient-to-b from-neutral-800 via-neutral-900 to-neutral-950 px-3 py-1.5 text-[11px] font-semibold transition-all hover:from-neutral-700 hover:via-neutral-800 hover:to-neutral-900 active:from-neutral-900 active:to-black"
              >
                <span className="pointer-events-none absolute inset-0 animate-shimmer bg-gradient-to-r from-transparent via-white/15 to-transparent bg-[length:200%_100%]" />
                <Eye className="relative h-3 w-3 text-amber-400" />
                <span className="relative animate-shimmer bg-[length:200%_100%] bg-gradient-to-r from-amber-400 via-yellow-200 to-amber-400 bg-clip-text text-transparent">{getActionRequiredLabel(data)}</span>
              </button>
            ) : data.state === 'error' && data.onRetry ? (
              <button
                type="button"
                aria-label="Retry"
                data-testid="feature-node-retry-button"
                onClick={(e) => {
                  e.stopPropagation();
                  data.onRetry!(data.featureId);
                }}
                className="nodrag inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-md bg-neutral-800 px-2.5 py-1 text-[11px] font-medium text-white shadow-sm transition-all hover:bg-neutral-700 active:bg-neutral-900 dark:bg-neutral-200 dark:text-neutral-900 dark:hover:bg-neutral-300"
              >
                <RotateCcw className="h-3 w-3" />
                Retry
              </button>
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
              <button
                type="button"
                aria-label="Start"
                data-testid="feature-node-start-button"
                onClick={(e) => {
                  e.stopPropagation();
                  data.onStart!(data.featureId);
                }}
                className="nodrag inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-md bg-neutral-800 px-2.5 py-1 text-[11px] font-medium text-white shadow-sm transition-all hover:bg-neutral-700 active:bg-neutral-900 dark:bg-neutral-200 dark:text-neutral-900 dark:hover:bg-neutral-300"
              >
                <Play className="h-3 w-3" />
                Start
              </button>
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
          <button
            type="button"
            aria-label="Add"
            data-testid="feature-node-action-button"
            onClick={(e) => {
              e.stopPropagation();
              data.onAction?.();
            }}
            className="nodrag absolute top-1/2 left-1/2 flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-blue-500 text-white opacity-0 shadow-md transition-opacity group-hover:opacity-100 hover:bg-blue-600"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
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
