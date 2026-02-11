import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Sidebar } from '@/components/layouts/sidebar';
import type { NavItem } from '@/components/layouts/sidebar';
import { Header } from '@/components/layouts/header';

interface DashboardLayoutProps {
  sidebarItems: NavItem[];
  pathname: string;
  title: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function DashboardLayout({
  sidebarItems,
  pathname,
  title,
  actions,
  children,
  className,
}: DashboardLayoutProps) {
  return (
    <div className={cn('flex h-screen', className)}>
      <aside className="w-64 border-r">
        <Sidebar items={sidebarItems} pathname={pathname} />
      </aside>
      <div className="flex flex-1 flex-col">
        <Header title={title} actions={actions} />
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
}
