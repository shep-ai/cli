'use client';

import { SidebarGroup } from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';

export interface SidebarSectionHeaderProps {
  label: string;
  className?: string;
}

export function SidebarSectionHeader({ label, className }: SidebarSectionHeaderProps) {
  return (
    <SidebarGroup data-testid="sidebar-section-header" className={cn('px-2 py-1', className)}>
      <div className="text-sidebar-foreground flex h-7 w-full shrink-0 items-center px-2 text-sm font-medium">
        <span className="min-w-0 flex-1 truncate">{label}</span>
      </div>
    </SidebarGroup>
  );
}
