'use client';

import type { ReactNode } from 'react';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/layouts/app-sidebar';
import { ThemeToggle } from '@/components/common/theme-toggle';

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <SidebarProvider>
      <AppSidebar features={[]} />
      <SidebarInset>
        <div className="relative h-full">
          <div className="absolute top-3 right-3 z-50">
            <ThemeToggle />
          </div>
          <main className="h-full">{children}</main>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
