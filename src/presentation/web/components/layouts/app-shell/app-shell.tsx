'use client';

import { useCallback, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/layouts/app-sidebar';
import { AddRepositoryButton } from '@/components/common/add-repository-button';
import { ThemeToggle } from '@/components/common/theme-toggle';
import { SoundToggle } from '@/components/common/sound-toggle';
import { AgentEventsProvider } from '@/hooks/agent-events-provider';
import { DrawerCloseGuardProvider, useDrawerCloseGuard } from '@/hooks/drawer-close-guard';
import {
  SidebarFeaturesProvider,
  useSidebarFeaturesContext,
} from '@/hooks/sidebar-features-context';

import { useNotifications } from '@/hooks/use-notifications';
import { useFeatureFlags } from '@/hooks/feature-flags-context';

interface AppShellProps {
  children: ReactNode;
}

/** Inner shell that consumes the agent-events context for notifications. */
function AppShellInner({ children }: AppShellProps) {
  const router = useRouter();
  const { guardedNavigate } = useDrawerCloseGuard();
  const featureFlags = useFeatureFlags();

  // Subscribe to agent lifecycle events and dispatch toast/browser notifications
  useNotifications();

  const { features } = useSidebarFeaturesContext();
  const handleNewFeature = useCallback(() => {
    guardedNavigate(() => router.push('/create'));
  }, [router, guardedNavigate]);

  const handleFeatureClick = useCallback(
    (featureId: string) => {
      guardedNavigate(() => router.push(`/feature/${featureId}`));
    },
    [router, guardedNavigate]
  );

  const handleRepositorySelect = useCallback((path: string) => {
    window.dispatchEvent(new CustomEvent('shep:add-repository', { detail: { path } }));
  }, []);

  return (
    <SidebarProvider defaultOpen={false}>
      <AppSidebar
        features={features}
        featureFlags={featureFlags}
        onNewFeature={handleNewFeature}
        onFeatureClick={handleFeatureClick}
      />
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

export function AppShell({ children }: AppShellProps) {
  return (
    <AgentEventsProvider>
      <DrawerCloseGuardProvider>
        <SidebarFeaturesProvider>
          <AppShellInner>{children}</AppShellInner>
        </SidebarFeaturesProvider>
      </DrawerCloseGuardProvider>
    </AgentEventsProvider>
  );
}
