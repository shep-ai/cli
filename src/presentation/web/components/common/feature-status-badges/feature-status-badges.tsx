import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import {
  featureStatusConfig,
  featureStatusOrder,
  type FeatureStatus,
} from '@/components/common/feature-status-config';

export interface FeatureStatusBadgesProps {
  /** Count of features per status. */
  counts: Record<FeatureStatus, number>;
  className?: string;
}

export function FeatureStatusBadges({ counts, className }: FeatureStatusBadgesProps) {
  const visibleStatuses = featureStatusOrder.filter((s) => counts[s] > 0);

  if (visibleStatuses.length === 0) return null;

  return (
    <div
      data-testid="feature-status-badges"
      className={cn('flex flex-col items-center gap-1.5 py-1', className)}
    >
      {visibleStatuses.map((status) => {
        const { icon: Icon, iconClass, bgClass, label } = featureStatusConfig[status];
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
              {label}: {counts[status]}
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}
