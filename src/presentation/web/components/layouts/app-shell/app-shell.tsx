'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { DashboardLayout } from '@/components/layouts/dashboard-layout';
import { ThemeToggle } from '@/components/common/theme-toggle';
import type { NavItem } from '@/components/layouts/sidebar';

const navItems: NavItem[] = [
  { label: 'Home', href: '/' },
  { label: 'Version', href: '/version' },
];

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();

  return (
    <DashboardLayout
      sidebarItems={navItems}
      pathname={pathname}
      title="Shep AI"
      actions={<ThemeToggle />}
    >
      {children}
    </DashboardLayout>
  );
}
