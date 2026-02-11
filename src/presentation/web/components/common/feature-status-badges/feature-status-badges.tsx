import { CircleAlert, Loader2, CircleCheck } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { FeatureStatus } from '@/components/common/feature-list-item';

interface StatusBadgeConfig {
  icon: LucideIcon;
  iconClass: string;
  bgClass: string;
  tooltip: string;
}

const statusConfig: Record<FeatureStatus, StatusBadgeConfig> = {
  'action-needed': {
    icon: CircleAlert,
    iconClass: 'text-amber-500',
    bgClass: 'bg-amber-500/10',
    tooltip: 'Action Needed',
  },
  'in-progress': {
    icon: Loader2,
    iconClass: 'text-blue-500 animate-spin',
    bgClass: 'bg-blue-500/10',
    tooltip: 'In Progress',
  },
  done: {
    icon: CircleCheck,
    iconClass: 'text-emerald-500',
    bgClass: 'bg-emerald-500/10',
    tooltip: 'Done',
  },
};

const statusOrder: FeatureStatus[] = ['action-needed', 'in-progress', 'done'];

export interface FeatureStatusBadgesProps {
  /** Count of features per status. */
  counts: Record<FeatureStatus, number>;
  className?: string;
}

export function FeatureStatusBadges({ counts, className }: FeatureStatusBadgesProps) {
  const visibleStatuses = statusOrder.filter((s) => counts[s] > 0);

  if (visibleStatuses.length === 0) return null;

  return (
    <div
      data-testid="feature-status-badges"
      className={cn('flex flex-col items-center gap-1.5 py-1', className)}
    >
      {visibleStatuses.map((status) => {
        const { icon: Icon, iconClass, bgClass, tooltip } = statusConfig[status];
        return (
          <Tooltip key={status}>
            <TooltipTrigger asChild>
              <div
                data-testid={`feature-status-badge-${status}`}
                className={cn(
                  'flex size-8 items-center justify-center gap-0.5 rounded-md',
                  bgClass
                )}
              >
                <Icon className={cn('size-3.5 shrink-0', iconClass)} />
                <span className="text-[0.6rem] font-semibold tabular-nums">{counts[status]}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent side="right">
              {tooltip}: {counts[status]}
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}
