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
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={active} tooltip={label}>
        <a href={href}>
          <Icon />
          <span>{label}</span>
        </a>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}
