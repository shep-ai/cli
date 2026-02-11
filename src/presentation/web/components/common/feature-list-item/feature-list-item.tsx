'use client';

import { CircleAlert, Loader2, CircleCheck } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { SidebarMenuItem, SidebarMenuButton } from '@/components/ui/sidebar';
import { ElapsedTime } from '@/components/common/elapsed-time';

export type FeatureStatus = 'action-needed' | 'in-progress' | 'done';

const statusConfig: Record<FeatureStatus, { icon: LucideIcon; iconClass: string }> = {
  'action-needed': { icon: CircleAlert, iconClass: 'text-amber-500' },
  'in-progress': { icon: Loader2, iconClass: 'text-blue-500 animate-spin' },
  done: { icon: CircleCheck, iconClass: 'text-emerald-500' },
};

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
  const { icon: StatusIcon, iconClass } = statusConfig[status];

  return (
    <SidebarMenuItem data-testid="feature-list-item">
      <SidebarMenuButton size="sm" onClick={onClick} tooltip={name} className="cursor-pointer">
        <StatusIcon className={iconClass} />
        <span className="flex-1 truncate font-medium">{name}</span>
        {status === 'in-progress' && startedAt != null && (
          <span
            data-testid="feature-list-item-meta"
            className="text-muted-foreground ml-auto text-xs tabular-nums"
          >
            <ElapsedTime startedAt={startedAt} />
          </span>
        )}
        {status === 'done' && duration && (
          <span
            data-testid="feature-list-item-meta"
            className="text-muted-foreground ml-auto text-xs tabular-nums"
          >
            {duration}
          </span>
        )}
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}
