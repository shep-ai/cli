'use client';

import { cn } from '@/lib/utils';
import { InteractiveSessionStatus } from '@shepai/core/domain/generated/output';
import { Loader2, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

/** Named boot stages shown during the agent startup sequence. */
export type BootStage = 'spawning' | 'loading-context';

/**
 * The full set of statuses the badge can display:
 * - Standard InteractiveSessionStatus values
 * - Named boot stage sub-states (shown while status === 'booting')
 */
export type AgentStatusValue = InteractiveSessionStatus | BootStage;

export interface AgentStatusBadgeProps {
  /** Current session status or named boot stage */
  status: AgentStatusValue;
  className?: string;
}

interface StatusConfig {
  label: string;
  icon: React.ReactNode;
  className: string;
}

const STATUS_CONFIG: Record<AgentStatusValue, StatusConfig> = {
  [InteractiveSessionStatus.booting]: {
    label: 'Booting...',
    icon: <Loader2 className="size-3 animate-spin" />,
    className:
      'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700',
  },
  spawning: {
    label: 'Spawning process',
    icon: <Loader2 className="size-3 animate-spin" />,
    className:
      'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700',
  },
  'loading-context': {
    label: 'Loading context',
    icon: <Loader2 className="size-3 animate-spin" />,
    className:
      'bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-700',
  },
  [InteractiveSessionStatus.ready]: {
    label: 'Ready',
    icon: <CheckCircle2 className="size-3" />,
    className:
      'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-700',
  },
  [InteractiveSessionStatus.stopped]: {
    label: 'Stopped',
    icon: <XCircle className="size-3" />,
    className:
      'bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-600',
  },
  [InteractiveSessionStatus.error]: {
    label: 'Error',
    icon: <AlertCircle className="size-3" />,
    className:
      'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-700',
  },
};

/**
 * Small inline badge showing the current interactive session status.
 * Maps each status to a distinct color, icon, and label.
 * Animated spinner shown for booting/spawning/loading-context states.
 */
export function AgentStatusBadge({ status, className }: AgentStatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG[InteractiveSessionStatus.booting];

  return (
    <span
      role="status"
      aria-label={`Agent status: ${config.label}`}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium',
        config.className,
        className
      )}
    >
      {config.icon}
      {config.label}
    </span>
  );
}
