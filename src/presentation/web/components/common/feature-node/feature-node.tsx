'use client';

import { Handle, Position } from '@xyflow/react';
import { Settings, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { featureNodeStateConfig } from './feature-node-state-config';
import type { FeatureNodeData } from './feature-node-state-config';

function getBadgeText(data: FeatureNodeData): string {
  const config = featureNodeStateConfig[data.state];
  switch (data.state) {
    case 'done':
      return data.runtime ? `Completed in ${data.runtime}` : 'Completed';
    case 'blocked':
      return data.blockedBy ? `Waiting on ${data.blockedBy}` : 'Blocked';
    case 'error':
      return data.errorMessage ?? 'Something went wrong';
    default:
      return config.label;
  }
}

export function FeatureNode({ data }: { data: FeatureNodeData; [key: string]: unknown }) {
  const config = featureNodeStateConfig[data.state];
  const Icon = config.icon;

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

      <div
        data-testid="feature-node-card"
        className={cn(
          'bg-card flex min-h-35 w-72 flex-col rounded-lg border border-l-4 p-3 shadow-sm',
          config.borderClass
        )}
      >
        {/* Top row: lifecycle label + settings */}
        <div className="flex items-center justify-between">
          <span
            data-testid="feature-node-lifecycle-label"
            className={cn('text-[10px] font-semibold tracking-wider', config.labelClass)}
          >
            {data.lifecycle.toUpperCase()}
          </span>
          {data.onSettings ? (
            <button
              type="button"
              aria-label="Settings"
              data-testid="feature-node-settings-button"
              onClick={(e) => {
                e.stopPropagation();
                data.onSettings?.();
              }}
              className="nodrag text-muted-foreground hover:text-foreground -mt-1 -mr-1 p-1"
            >
              <Settings className="h-3.5 w-3.5" />
            </button>
          ) : null}
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

        {/* Bottom section — pushed to bottom for consistent card height */}
        <div className="mt-auto pt-2">
          {config.showProgressBar ? (
            <>
              {/* Bottom row: featureId + progress percentage */}
              <div className="text-muted-foreground flex items-center justify-between text-[10px]">
                <span>{data.featureId}</span>
                <span>{data.progress}%</span>
              </div>

              {/* Progress bar */}
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
              {/* featureId row (no progress percentage) */}
              <div className="text-muted-foreground text-[10px]">
                <span>{data.featureId}</span>
              </div>

              {/* State badge */}
              <div
                data-testid="feature-node-badge"
                className={cn(
                  'mt-1.5 flex items-center justify-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium',
                  config.badgeBgClass,
                  config.badgeClass
                )}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{getBadgeText(data)}</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Source handle — action button rendered as detached handle child */}
      {data.onAction ? (
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
