'use client';

import { Folder, GripHorizontal } from 'lucide-react';
import { SidebarGroup } from '@/components/ui/sidebar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useSidebar } from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';

export interface SidebarSectionHeaderProps {
  label: string;
  onFolderClick?: () => void;
  onMenuClick?: () => void;
  className?: string;
}

export function SidebarSectionHeader({
  label,
  onFolderClick,
  onMenuClick,
  className,
}: SidebarSectionHeaderProps) {
  const { state, isMobile } = useSidebar();

  return (
    <SidebarGroup data-testid="sidebar-section-header" className={cn('px-2 py-1', className)}>
      <div className="text-sidebar-foreground flex h-7 w-full shrink-0 items-center px-2 text-sm font-medium">
        <span className="min-w-0 flex-1 truncate">{label}</span>
        <span className="text-sidebar-foreground/70 flex shrink-0 items-center gap-0.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={onFolderClick}
                className="hover:bg-sidebar-accent hover:text-sidebar-accent-foreground ring-sidebar-ring flex size-7 items-center justify-center rounded-md p-0 outline-hidden transition-colors focus-visible:ring-2 [&>svg]:size-4"
                aria-label="Open features folder"
              >
                <Folder className="size-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" align="center" hidden={state !== 'collapsed' || isMobile}>
              Open features folder
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={onMenuClick}
                className="hover:bg-sidebar-accent hover:text-sidebar-accent-foreground ring-sidebar-ring flex size-7 items-center justify-center rounded-md p-0 outline-hidden transition-colors focus-visible:ring-2 [&>svg]:size-4"
                aria-label="Features options"
              >
                <GripHorizontal className="size-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" align="center" hidden={state !== 'collapsed' || isMobile}>
              Features options
            </TooltipContent>
          </Tooltip>
        </span>
      </div>
    </SidebarGroup>
  );
}
