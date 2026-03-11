'use client';

import { useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import {
  Plus,
  FileText,
  Wrench,
  GitMerge,
  Trash2,
  Zap,
  Loader2,
  Globe,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { DeleteFeatureDialog } from '@/components/common/delete-feature-dialog';
import {
  featureNodeStateConfig,
  lifecycleDisplayLabels,
  lifecycleRunningVerbs,
} from './feature-node-state-config';
import type { FeatureNodeData } from './feature-node-state-config';
import { getAgentTypeIcon, agentTypeLabels, type AgentTypeValue } from './agent-type-icons';
import { getModelMeta } from '@/lib/model-metadata';
import { DeploymentState } from '@shepai/core/domain/generated/output';

function AgentIcon({ agentType, className }: { agentType?: string; className?: string }) {
  const IconComponent = getAgentTypeIcon(agentType);
  return <IconComponent className={className} />;
}

function getBadgeIcon(data: FeatureNodeData): LucideIcon {
  const config = featureNodeStateConfig[data.state];
  if (data.state === 'action-required') {
    if (data.lifecycle === 'requirements') return FileText;
    if (data.lifecycle === 'implementation') return Wrench;
    if (data.lifecycle === 'review') return GitMerge;
  }
  return config.icon;
}

/** Returns override badge classes for action-required based on lifecycle phase. */
function getActionRequiredBadgeClasses(data: FeatureNodeData): {
  badgeClass: string;
  badgeBgClass: string;
} | null {
  if (data.state !== 'action-required') return null;
  if (data.lifecycle === 'implementation') {
    return { badgeClass: 'text-indigo-700', badgeBgClass: 'bg-indigo-50' };
  }
  if (data.lifecycle === 'review') {
    return { badgeClass: 'text-emerald-700', badgeBgClass: 'bg-emerald-50' };
  }
  return null; // requirements stays amber (default)
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
    case 'action-required':
      if (data.lifecycle === 'requirements') return 'Review Product Requirements';
      if (data.lifecycle === 'implementation') return 'Review Technical Planning';
      if (data.lifecycle === 'review') return 'Review Merge Request';
      return config.label;
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
    <div className="group relative">
      {data.showHandles ? (
        <Handle
          type="target"
          position={Position.Left}
          isConnectable={false}
          className="opacity-0!"
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
            onConfirm={(cleanup) => {
              setConfirmOpen(false);
              data.onDelete?.(data.featureId, cleanup);
            }}
            isDeleting={false}
            featureName={data.name ?? 'this feature'}
            featureId={data.featureId}
          />
        </>
      ) : null}

      <div
        data-testid="feature-node-card"
        aria-busy={data.state === 'creating' || data.state === 'deleting' ? 'true' : undefined}
        className={cn(
          'bg-card flex min-h-35 w-72 cursor-pointer flex-col rounded-lg border p-3 shadow-sm',
          selected && 'ring-primary ring-2',
          data.state === 'deleting' && 'opacity-60'
        )}
      >
        {/* Top row: lifecycle label + agent icon */}
        <div className="flex items-center justify-between">
          <span
            data-testid="feature-node-lifecycle-label"
            className={cn('text-[10px] font-semibold tracking-wider')}
          >
            {data.state === 'blocked' ? 'BLOCKED' : lifecycleDisplayLabels[data.lifecycle]}
          </span>
          <div className="flex items-center gap-0.5">
            {data.fastMode ? (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span data-testid="feature-node-fast-mode-badge" className="-mt-1 p-1">
                      <Zap className="h-3.5 w-3.5 text-amber-500" />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">Fast Mode</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : null}
            {data.agentType ? (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      aria-label={
                        agentTypeLabels[data.agentType as AgentTypeValue] ?? data.agentType
                      }
                      data-testid="feature-node-agent-badge"
                      onClick={(e) => {
                        e.stopPropagation();
                        data.onSettings?.();
                      }}
                      className={cn(
                        'nodrag -mt-1 -mr-1 p-1',
                        data.onSettings
                          ? 'cursor-pointer opacity-80 transition-opacity hover:opacity-100'
                          : 'cursor-default'
                      )}
                    >
                      <AgentIcon agentType={data.agentType} className="h-3.5 w-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <span className="font-medium">
                      {agentTypeLabels[data.agentType as AgentTypeValue] ?? data.agentType}
                    </span>
                    {data.modelId ? (
                      <span className="ml-1 opacity-70">
                        · {getModelMeta(data.modelId).displayName || data.modelId}
                      </span>
                    ) : null}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : null}
          </div>
        </div>

        {/* Name */}
        <h3 className="mt-1 truncate text-sm font-bold">{data.name}</h3>

        {/* Description */}
        {data.description ? (
          <p
            data-testid="feature-node-description"
            className="text-muted-foreground mt-0.5 truncate text-xs"
          >
            {data.description}
          </p>
        ) : null}

        {/* Deployment status indicator */}
        {data.deployment ? (
          <div
            data-testid="feature-node-deployment-indicator"
            className={cn(
              'mt-1.5 flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium',
              data.deployment.status === DeploymentState.Booting
                ? 'bg-blue-50 text-blue-700'
                : 'bg-green-50 text-green-700'
            )}
          >
            {data.deployment.status === DeploymentState.Booting ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Globe className="h-3 w-3" />
            )}
            <span className="truncate">
              {data.deployment.status === DeploymentState.Booting
                ? 'Deploying...'
                : (data.deployment.url ?? 'Live')}
            </span>
          </div>
        ) : null}

        {/* Bottom section — pushed to bottom for consistent card height */}
        <div className="mt-auto pt-2">
          {data.state === 'deleting' ? (
            <>
              {/* Deleting status: trash icon + "Deleting..." text */}
              <div className="mt-1.5 flex items-center gap-1.5 text-xs">
                <Trash2 className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                <span className="text-muted-foreground">Deleting…</span>
              </div>

              {/* Indeterminate progress bar */}
              <div
                data-testid="feature-node-progress-bar"
                className="bg-muted mt-1.5 h-1 w-full overflow-hidden rounded-full"
              >
                <div className="motion-safe:animate-indeterminate-progress bg-foreground/30 h-full w-1/3 rounded-full" />
              </div>
            </>
          ) : data.state === 'creating' ? (
            <>
              {/* Creating status: loader icon + "Creating..." text */}
              <div className="mt-1.5 flex items-center gap-1.5 text-xs">
                <Icon className="h-3.5 w-3.5 shrink-0 animate-spin" />
                <span className="text-muted-foreground">{getBadgeText(data)}</span>
              </div>

              {/* Indeterminate progress bar */}
              <div
                data-testid="feature-node-progress-bar"
                className="bg-muted mt-1.5 h-1 w-full overflow-hidden rounded-full"
              >
                <div className="motion-safe:animate-indeterminate-progress bg-foreground/30 h-full w-1/3 rounded-full" />
              </div>
            </>
          ) : data.state === 'running' ? (
            <>
              {/* Running status: agent icon + verb */}
              <div className="mt-1.5 flex items-center gap-1.5 text-xs">
                <AgentIcon agentType={data.agentType} className="h-3.5 w-3.5 shrink-0" />
                <span className="text-muted-foreground">{getBadgeText(data)}</span>
              </div>

              {/* Indeterminate progress bar */}
              <div
                data-testid="feature-node-progress-bar"
                className="bg-muted mt-1.5 h-1 w-full overflow-hidden rounded-full"
              >
                <div className="animate-indeterminate-progress bg-foreground/30 h-full w-1/3 rounded-full" />
              </div>
            </>
          ) : config.showProgressBar ? (
            <>
              {/* Bottom row: progress percentage */}
              <div className="text-muted-foreground flex items-center justify-end text-[10px]">
                <span>{data.progress}%</span>
              </div>

              {/* Determinate progress bar */}
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
          ) : (
            <>
              {/* featureId row */}
              <div className="text-muted-foreground text-[10px]">
                <span>{data.featureId}</span>
              </div>

              {/* State badge */}
              <div
                data-testid="feature-node-badge"
                className={(() => {
                  const override = getActionRequiredBadgeClasses(data);
                  return cn(
                    'mt-1.5 flex items-center justify-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium',
                    override?.badgeBgClass ?? config.badgeBgClass,
                    override?.badgeClass ?? config.badgeClass
                  );
                })()}
              >
                {(() => {
                  const BadgeIcon = getBadgeIcon(data);
                  return <BadgeIcon className="h-3.5 w-3.5 shrink-0" />;
                })()}
                <span className="truncate">{getBadgeText(data)}</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Source handle — action button rendered as detached handle child (hidden when deleting) */}
      {data.onAction && data.state !== 'deleting' ? (
        <Handle
          type="source"
          position={Position.Right}
          className="h-0! w-0! border-0! bg-transparent!"
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
        />
      ) : null}
    </div>
  );
}
