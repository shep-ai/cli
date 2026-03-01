'use client';

import { useCallback } from 'react';
import { ArrowUp, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { featureNodeStateConfig } from '@/components/common/feature-node';
import type { FeatureNodeData } from '@/components/common/feature-node';

export interface DependencyListProps {
  direction: 'upstream' | 'downstream';
  items: FeatureNodeData[];
  onSelect?: (featureId: string) => void;
}

const LABELS: Record<DependencyListProps['direction'], string> = {
  upstream: 'Blocked by',
  downstream: 'Blocks',
};

export function DependencyList({ direction, items, onSelect }: DependencyListProps) {
  const label = LABELS[direction];
  const DirectionIcon = direction === 'upstream' ? ArrowUp : ArrowDown;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="text-muted-foreground flex items-center gap-1.5 text-xs font-semibold tracking-wider uppercase">
        <DirectionIcon className="h-3 w-3" />
        {label}
      </div>

      {items.length === 0 ? (
        <p className="text-muted-foreground py-2 text-xs">No dependencies</p>
      ) : (
        <div className="flex flex-col gap-0.5">
          {items.map((item) => (
            <DependencyItem key={item.featureId} data={item} onSelect={onSelect} />
          ))}
        </div>
      )}
    </div>
  );
}

interface DependencyItemProps {
  data: FeatureNodeData;
  onSelect?: (featureId: string) => void;
}

function DependencyItem({ data, onSelect }: DependencyItemProps) {
  const config = featureNodeStateConfig[data.state];
  const Icon = config.icon;
  const isSpinning = data.state === 'creating' || data.state === 'running';

  const handleClick = useCallback(() => {
    onSelect?.(data.featureId);
  }, [onSelect, data.featureId]);

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        'flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors',
        'hover:bg-accent/50 cursor-pointer'
      )}
    >
      <Icon
        className={cn('h-3.5 w-3.5 shrink-0', config.badgeClass, isSpinning && 'animate-spin')}
      />
      <span className="truncate">{data.name}</span>
      <span
        className={cn(
          'ml-auto inline-flex shrink-0 items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium',
          config.badgeClass,
          config.badgeBgClass
        )}
      >
        {config.label}
      </span>
    </button>
  );
}
