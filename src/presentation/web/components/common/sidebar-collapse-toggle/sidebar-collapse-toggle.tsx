'use client';

import { PanelLeft } from 'lucide-react';
import { useSidebar } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface SidebarCollapseToggleProps {
  className?: string;
}

export function SidebarCollapseToggle({ className }: SidebarCollapseToggleProps) {
  const { toggleSidebar, open } = useSidebar();
  const label = open ? 'Collapse sidebar' : 'Expand sidebar';

  return (
    <div className={cn('flex', className)}>
      <Button
        data-testid="sidebar-collapse-toggle"
        variant="ghost"
        size="icon"
        className="size-7 cursor-pointer group-data-[collapsible=icon]:size-8!"
        onClick={toggleSidebar}
        aria-label={label}
      >
        <PanelLeft className="size-4" />
      </Button>
    </div>
  );
}
