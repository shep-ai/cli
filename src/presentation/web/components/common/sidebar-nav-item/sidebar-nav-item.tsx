import Link from 'next/link';
import type { Route } from 'next';
import type { LucideIcon } from 'lucide-react';
import { SidebarMenuItem, SidebarMenuButton } from '@/components/ui/sidebar';

export interface SidebarNavItemProps {
  icon: LucideIcon;
  label: string;
  href: string;
  active?: boolean;
}

export function SidebarNavItem({ icon: Icon, label, href, active = false }: SidebarNavItemProps) {
  return (
    <SidebarMenuItem data-testid="sidebar-nav-item">
      <SidebarMenuButton asChild isActive={active} tooltip={label}>
        <Link href={href as Route}>
          <Icon />
          <span>{label}</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}
