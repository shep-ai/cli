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
    <SidebarGroup className="px-2 py-1">
      <SidebarGroupLabel className="text-sidebar-foreground/50 h-6 px-2 text-[0.65rem] font-semibold tracking-wider uppercase">
        {label}
        <span className="bg-sidebar-accent text-sidebar-foreground/60 ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[0.6rem] font-medium tabular-nums">
          {count}
        </span>
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu className="gap-0.5">{children}</SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
