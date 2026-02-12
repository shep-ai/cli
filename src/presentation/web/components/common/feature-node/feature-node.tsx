'use client';

import { Handle, Position } from '@xyflow/react';
import { Settings, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { featureNodeStateConfig } from './feature-node-state-config';
import type { FeatureNodeData } from './feature-node-state-config';

export function FeatureNode({ data }: { data: FeatureNodeData; [key: string]: unknown }) {
  const config = featureNodeStateConfig[data.state];

  return (
    <div className="relative">
      <Handle type="target" position={Position.Left} />

      <div
        data-testid="feature-node-card"
        className={cn(
          'bg-card w-56 rounded-lg border border-l-4 p-3 shadow-sm',
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
              data-testid="feature-node-settings-button"
              onClick={(e) => {
                e.stopPropagation();
                data.onSettings?.();
              }}
              className="text-muted-foreground hover:text-foreground -mt-1 -mr-1 p-1"
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

        {/* Bottom row: featureId + progress percentage */}
        <div className="text-muted-foreground mt-2 flex items-center justify-between text-[10px]">
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
      </div>

      {/* Action button */}
      {data.onAction ? (
        <button
          data-testid="feature-node-action-button"
          onClick={(e) => {
            e.stopPropagation();
            data.onAction?.();
          }}
          className="absolute top-1/2 -right-3 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full bg-blue-500 text-white shadow-md hover:bg-blue-600"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      ) : null}

      <Handle type="source" position={Position.Right} />
    </div>
  );
}
