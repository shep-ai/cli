'use client';

import { useCallback } from 'react';
import { ExternalLink, Eye, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { featureNodeStateConfig, lifecycleDisplayLabels } from '@/components/common/feature-node';
import type { FeatureNodeData } from '@/components/common/feature-node';
import { getAgentTypeIcon } from '@/components/common/feature-node/agent-type-icons';

export interface BoardRowProps {
  data: FeatureNodeData;
  isSelected?: boolean;
  tabIndex?: number;
  onSelect?: (data: FeatureNodeData) => void;
  onDetails?: (data: FeatureNodeData) => void;
}

export function BoardRow({
  data,
  isSelected = false,
  tabIndex = -1,
  onSelect,
  onDetails,
}: BoardRowProps) {
  const config = featureNodeStateConfig[data.state];
  const Icon = config.icon;
  const isSpinning = data.state === 'creating' || data.state === 'running';

  const handleClick = useCallback(() => {
    onSelect?.(data);
  }, [onSelect, data]);

  const handleDetailsClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onDetails?.(data);
    },
    [onDetails, data]
  );

  const handleDeleteClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      data.onDelete?.(data.featureId);
    },
    [data]
  );

  const AgentIcon = data.agentType ? getAgentTypeIcon(data.agentType) : null;

  return (
    <div
      role="option"
      aria-selected={isSelected}
      tabIndex={tabIndex}
      onClick={handleClick}
      className={cn(
        'group flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors',
        'hover:bg-accent/50',
        isSelected && 'bg-accent border-primary/30',
        !isSelected && 'border-transparent'
      )}
    >
      {/* Status icon */}
      <Icon className={cn('h-4 w-4 shrink-0', config.badgeClass, isSpinning && 'animate-spin')} />

      {/* Feature info */}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        {/* Name row */}
        <div className="flex items-center gap-2">
          <span className="truncate font-medium">{data.name}</span>

          {/* Agent icon */}
          {AgentIcon ? (
            <span data-testid="board-row-agent-icon" className="shrink-0">
              <AgentIcon className="h-3.5 w-3.5" />
            </span>
          ) : null}

          {/* PR badge */}
          {data.pr ? (
            <span
              data-testid="board-row-pr"
              className="text-muted-foreground flex shrink-0 items-center gap-0.5 text-xs"
            >
              <ExternalLink className="h-3 w-3" />#{data.pr.number}
            </span>
          ) : null}
        </div>

        {/* Metadata row */}
        <div className="flex items-center gap-2 text-xs">
          {/* Lifecycle label */}
          <span className="text-muted-foreground text-[10px] font-semibold tracking-wider">
            {data.state === 'blocked' ? 'BLOCKED' : lifecycleDisplayLabels[data.lifecycle]}
          </span>

          {/* Status badge */}
          <span
            data-testid="board-row-status-badge"
            className={cn(
              'inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium',
              config.badgeClass,
              config.badgeBgClass
            )}
          >
            {config.label}
          </span>

          {/* Blocked by indicator */}
          {data.state === 'blocked' && data.blockedBy ? (
            <span className="text-muted-foreground truncate text-[10px]">
              Blocked by {data.blockedBy}
            </span>
          ) : null}

          {/* Progress bar */}
          {data.progress > 0 && data.progress < 100 && (
            <div
              data-testid="board-row-progress"
              className="bg-muted ml-auto h-1 w-12 shrink-0 overflow-hidden rounded-full"
            >
              <div
                className={cn('h-full rounded-full', config.progressClass)}
                style={{ width: `${data.progress}%` }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Hover actions */}
      <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        {onDetails ? (
          <button
            type="button"
            aria-label="View details"
            onClick={handleDetailsClick}
            className="text-muted-foreground hover:text-foreground flex h-6 w-6 items-center justify-center rounded-md transition-colors"
          >
            <Eye className="h-3.5 w-3.5" />
          </button>
        ) : null}
        {data.onDelete ? (
          <button
            type="button"
            aria-label="Delete feature"
            onClick={handleDeleteClick}
            className="text-muted-foreground hover:text-destructive flex h-6 w-6 items-center justify-center rounded-md transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>
    </div>
  );
}
