'use client';

import { RotateCcw, Square, Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CometSpinner } from '@/components/ui/comet-spinner';
import { featureNodeStateConfig, lifecycleDisplayLabels } from '@/components/common/feature-node';
import type { FeatureNodeData } from '@/components/common/feature-node';

interface FeatureRunningControlsProps {
  data: FeatureNodeData;
}

/**
 * Controls bar rendered above all feature drawer tabs.
 * Shows the lifecycle phase label, current state badge, and context-appropriate
 * action buttons (Stop, Retry, Start) regardless of which tab is active.
 */
export function FeatureRunningControls({ data }: FeatureRunningControlsProps) {
  const config = featureNodeStateConfig[data.state];
  const Icon = config.icon;
  const isRunning = data.state === 'running' || data.state === 'action-required';
  const isError = data.state === 'error';
  const isPending = data.state === 'pending';

  return (
    <div
      data-testid="feature-drawer-controls"
      className="flex shrink-0 items-center gap-2 border-b px-4 py-2.5"
    >
      {/* Lifecycle phase label */}
      <span className="text-muted-foreground min-w-0 flex-1 truncate text-xs font-semibold tracking-widest uppercase">
        {lifecycleDisplayLabels[data.lifecycle]}
      </span>

      {/* State badge */}
      <div
        data-testid="feature-drawer-state-badge"
        className={cn(
          'flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
          config.badgeBgClass,
          config.badgeClass
        )}
      >
        {data.state === 'running' ? (
          <CometSpinner size="sm" className="shrink-0" />
        ) : (
          <Icon className="h-3.5 w-3.5 shrink-0" />
        )}
        <span>{config.label}</span>
      </div>

      {/* Stop button — running / action-required states */}
      {isRunning && data.onStop ? (
        <button
          data-testid="feature-drawer-stop-button"
          onClick={() => data.onStop!(data.featureId)}
          className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 transition-colors hover:bg-red-100"
        >
          <Square className="h-3.5 w-3.5 fill-red-700" />
          Stop
        </button>
      ) : null}

      {/* Retry button — error state */}
      {isError && data.onRetry ? (
        <button
          data-testid="feature-drawer-retry-button"
          onClick={() => data.onRetry!(data.featureId)}
          className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 transition-colors hover:bg-amber-100"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Retry
        </button>
      ) : null}

      {/* Start button — pending state */}
      {isPending && data.onStart ? (
        <button
          data-testid="feature-drawer-start-button"
          onClick={() => data.onStart!(data.featureId)}
          className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-100"
        >
          <Play className="h-3.5 w-3.5 fill-emerald-700" />
          Start
        </button>
      ) : null}
    </div>
  );
}
