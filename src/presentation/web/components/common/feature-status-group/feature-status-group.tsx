import type { ReactNode } from 'react';
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
} from '@/components/ui/sidebar';

export interface FeatureStatusGroupProps {
  label: string;
  count: number;
  children: ReactNode;
}

export function FeatureStatusGroup({ label, count, children }: FeatureStatusGroupProps) {
  return (
    <SidebarGroup data-testid="feature-status-group" className="px-2 py-1">
      <SidebarGroupLabel className="h-6 px-2 text-[0.65rem] font-semibold tracking-wider text-muted-foreground uppercase">
        {label}
        <span
          aria-label={`${count} items`}
          className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-sidebar-accent px-1 text-[0.6rem] font-medium text-sidebar-accent-foreground tabular-nums"
          role="img"
        >
          {count}
        </span>
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu className="gap-0.5">{children}</SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
