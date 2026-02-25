'use client';

import Link from 'next/link';
import type { Route } from 'next';
import type { LucideIcon } from 'lucide-react';
import { SidebarMenuItem, SidebarMenuButton } from '@/components/ui/sidebar';
import { useSoundAction } from '@/hooks/use-sound-action';

export interface SidebarNavItemProps {
  icon: LucideIcon;
  label: string;
  href: string;
  active?: boolean;
}

export function SidebarNavItem({ icon: Icon, label, href, active = false }: SidebarNavItemProps) {
  const navigateSound = useSoundAction('navigate');

  return (
    <SidebarMenuItem data-testid="sidebar-nav-item">
      <SidebarMenuButton asChild isActive={active} tooltip={label}>
        <Link href={href as Route} onClick={() => navigateSound.play()}>
          <Icon />
          <span>{label}</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}
