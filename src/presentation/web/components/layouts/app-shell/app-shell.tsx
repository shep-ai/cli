'use client';

import { useCallback, type ReactNode } from 'react';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/layouts/app-sidebar';
import { AddRepositoryButton } from '@/components/common/add-repository-node';
import { ThemeToggle } from '@/components/common/theme-toggle';
import { SoundToggle } from '@/components/common/sound-toggle';
import { AgentEventsProvider } from '@/hooks/agent-events-provider';
import { useNotifications } from '@/hooks/use-notifications';

interface AppShellProps {
  children: ReactNode;
  skillsEnabled?: boolean;
}

/** Inner shell that consumes the agent-events context for notifications. */
function AppShellInner({ children, skillsEnabled }: AppShellProps) {
  // Subscribe to agent lifecycle events and dispatch toast/browser notifications
  useNotifications();

  const handleNewFeature = useCallback(() => {
    window.dispatchEvent(new CustomEvent('shep:open-create-drawer'));
  }, []);

  const handleRepositorySelect = useCallback((path: string) => {
    window.dispatchEvent(new CustomEvent('shep:add-repository', { detail: { path } }));
  }, []);

  return (
    <SidebarProvider>
      <AppSidebar features={[]} skillsEnabled={skillsEnabled} onNewFeature={handleNewFeature} />
      <SidebarInset>
        <div className="relative h-full">
          <div className="absolute top-3 right-3 z-50 flex gap-1">
            <AddRepositoryButton onSelect={handleRepositorySelect} />
            <SoundToggle />
            <ThemeToggle />
          </div>
          <main className="h-full">{children}</main>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

export function AppShell({ children, skillsEnabled }: AppShellProps) {
  return (
    <AgentEventsProvider>
      <AppShellInner skillsEnabled={skillsEnabled}>{children}</AppShellInner>
    </AgentEventsProvider>
  );
}
