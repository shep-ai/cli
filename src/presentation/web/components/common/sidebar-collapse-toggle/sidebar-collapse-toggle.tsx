'use client';

import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { useSidebar } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export interface SidebarCollapseToggleProps {
  className?: string;
}

export function SidebarCollapseToggle({ className }: SidebarCollapseToggleProps) {
  const { toggleSidebar, open } = useSidebar();
  const Icon = open ? PanelLeftClose : PanelLeftOpen;
  const label = open ? 'Collapse sidebar' : 'Expand sidebar';

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          data-testid="sidebar-collapse-toggle"
          variant="ghost"
          size="icon"
          className={cn('size-7', className)}
          onClick={toggleSidebar}
          aria-label={label}
        >
          <Icon className="size-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );
}
