'use client';

import type { LucideIcon } from 'lucide-react';
import { Clock } from 'lucide-react';
import { SidebarMenuItem, SidebarMenuButton } from '@/components/ui/sidebar';
import { ElapsedTime } from '@/components/common/elapsed-time';

export type FeatureStatus = 'action-needed' | 'in-progress' | 'done';

const statusIcons: Partial<Record<FeatureStatus, LucideIcon>> = {
  'action-needed': Clock,
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
  const StatusIcon = statusIcons[status];

  return (
    <SidebarMenuItem>
      <SidebarMenuButton onClick={onClick}>
        {StatusIcon && <StatusIcon />}
        <span>{name}</span>
        {status === 'in-progress' && startedAt != null && <ElapsedTime startedAt={startedAt} />}
        {status === 'done' && duration && <span>{duration}</span>}
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}
