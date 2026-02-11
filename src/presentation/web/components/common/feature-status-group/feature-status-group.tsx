import type { ReactNode } from 'react';
import { SidebarGroup, SidebarGroupLabel, SidebarGroupContent } from '@/components/ui/sidebar';
import { Badge } from '@/components/ui/badge';

export interface FeatureStatusGroupProps {
  label: string;
  count: number;
  children: ReactNode;
}

export function FeatureStatusGroup({ label, count, children }: FeatureStatusGroupProps) {
  return (
    <SidebarGroup>
      <SidebarGroupLabel>
        {label}
        <Badge variant="secondary">{count}</Badge>
      </SidebarGroupLabel>
      <SidebarGroupContent>{children}</SidebarGroupContent>
    </SidebarGroup>
  );
}
