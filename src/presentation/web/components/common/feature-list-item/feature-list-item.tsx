'use client';

import { SidebarMenuItem, SidebarMenuButton } from '@/components/ui/sidebar';
import { ElapsedTime } from '@/components/common/elapsed-time';
import { featureStatusConfig } from '@/components/common/feature-status-config';
import type { FeatureStatus } from '@/components/common/feature-status-config';

export interface FeatureListItemProps {
  name: string;
  status: FeatureStatus;
  startedAt?: number;
  duration?: string;
  onClick?: () => void;
}

export function FeatureListItem({
  name,
  status,
  startedAt,
  duration,
  onClick,
}: FeatureListItemProps) {
  const { icon: StatusIcon, iconClass } = featureStatusConfig[status];

  return (
    <SidebarMenuItem data-testid="feature-list-item">
      <SidebarMenuButton size="sm" onClick={onClick} tooltip={name} className="cursor-pointer">
        <StatusIcon className={iconClass} />
        <span className="flex-1 truncate font-medium">{name}</span>
        {status === 'in-progress' && startedAt != null ? (
          <span
            data-testid="feature-list-item-meta"
            className="text-muted-foreground ml-auto text-xs tabular-nums"
          >
            <ElapsedTime startedAt={startedAt} />
          </span>
        ) : null}
        {status === 'done' && duration ? (
          <span
            data-testid="feature-list-item-meta"
            className="text-muted-foreground ml-auto text-xs tabular-nums"
          >
            {duration}
          </span>
        ) : null}
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}
