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
  RotateCcw,
  Play,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { DeleteFeatureDialog } from '@/components/common/delete-feature-dialog';
import {
  featureNodeStateConfig,
  lifecycleDisplayLabels,
  lifecycleRunningVerbs,
  lifecycleBorderColors,
  stateBorderColors,
} from './feature-node-state-config';
import type { FeatureNodeData } from './feature-node-state-config';
import { getAgentTypeIcon, agentTypeLabels, type AgentTypeValue } from './agent-type-icons';
import { getModelMeta } from '@/lib/model-metadata';
import { DeploymentState } from '@shepai/core/domain/generated/output';
import { FeatureSessionsDropdown } from './feature-sessions-dropdown';

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
    case 'pending':
      return 'Pending';
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
          'bg-card flex min-h-35 w-72 cursor-pointer flex-col rounded-lg border border-l-3 p-3 shadow-sm',
          stateBorderColors[data.state] ?? lifecycleBorderColors[data.lifecycle],
          selected && 'ring-primary ring-2',
          data.state === 'deleting' && 'opacity-60'
        )}
      >
        {/* Inline icons — absolute top-right corner */}
        {(data.deployment || data.fastMode || data.agentType) ? (
          <div className="absolute top-2 right-2 flex items-center gap-0.5">
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
                        'nodrag p-1',
                        data.deployment.status === DeploymentState.Ready && data.deployment.url
                          ? 'cursor-pointer opacity-80 transition-opacity hover:opacity-100'
                          : 'cursor-default'
                      )}
                    >
                      {data.deployment.status === DeploymentState.Booting ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-500" />
                      ) : (
                        <Globe className="h-3.5 w-3.5 text-green-600" />
                      )}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
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
                    <span data-testid="feature-node-fast-mode-badge" className="p-1">
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
                        'nodrag -mr-1 p-1',
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
        ) : null}

        {/* Name */}
        <h3 className="truncate text-sm font-bold">{data.name}</h3>

        {/* Description */}
        {data.description ? (
          <p
            data-testid="feature-node-description"
            className="text-muted-foreground mt-0.5 truncate text-xs"
          >
            {data.description}
          </p>
        ) : null}

        {/* Bottom section — pushed to bottom for consistent card height */}
        <div className="mt-auto pt-2">
          {/* Feature ID — always visible, truncated, copiable */}
          {data.featureId ? (
            <div className="mb-1.5 flex items-baseline gap-1">
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
          {data.state === 'deleting' ? (
            <>
              {/* Deleting status: spinner + "Deleting..." text */}
              <div className="mt-1.5 flex items-center gap-1.5 text-xs">
                <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-gray-400" />
                <span className="text-muted-foreground">Deleting…</span>
              </div>
            </>
          ) : data.state === 'creating' ? (
            <>
              {/* Creating status: loader icon + "Creating..." text */}
              <div className="mt-1.5 flex items-center gap-1.5 text-xs">
                <Icon className="h-3.5 w-3.5 shrink-0 animate-spin" />
                <span className="text-muted-foreground">{getBadgeText(data)}</span>
              </div>
            </>
          ) : data.state === 'running' ? (
            <>
              {/* Running status: spinner + verb */}
              <div className="mt-1.5 flex items-center gap-1.5 text-xs">
                <Icon className="h-3.5 w-3.5 shrink-0 animate-spin" />
                <span className="text-muted-foreground">{getBadgeText(data)}</span>
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
              {/* State badge */}
              <div className="mt-1.5 flex items-center gap-1.5">
                <div
                  data-testid="feature-node-badge"
                  className={(() => {
                    const override = getActionRequiredBadgeClasses(data);
                    return cn(
                      'flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium',
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
                {data.state === 'error' && data.onRetry ? (
                  <button
                    type="button"
                    aria-label="Retry feature"
                    data-testid="feature-node-retry-button"
                    onClick={(e) => {
                      e.stopPropagation();
                      data.onRetry!(data.featureId);
                    }}
                    className="nodrag flex shrink-0 cursor-pointer items-center gap-1 rounded-full bg-red-100 px-2.5 py-1 text-[11px] font-medium text-red-700 transition-colors hover:bg-red-200"
                  >
                    <RotateCcw className="h-3 w-3" />
                    Retry
                  </button>
                ) : null}
                {data.state === 'pending' && data.onStart ? (
                  <button
                    type="button"
                    aria-label="Start feature"
                    data-testid="feature-node-start-button"
                    onClick={(e) => {
                      e.stopPropagation();
                      data.onStart!(data.featureId);
                    }}
                    className="nodrag flex shrink-0 cursor-pointer items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-700 transition-colors hover:bg-slate-200"
                  >
                    <Play className="h-3 w-3" />
                    Start
                  </button>
                ) : null}
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
