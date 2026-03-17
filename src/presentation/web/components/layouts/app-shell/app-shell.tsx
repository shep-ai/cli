'use client';

import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Plus, FolderPlus, Github, GitBranch } from 'lucide-react';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/layouts/app-sidebar';
import {
  FloatingActionButton,
  type FloatingActionButtonAction,
} from '@/components/common/floating-action-button';
import { ThemeToggle } from '@/components/common/theme-toggle';
import { SoundToggle } from '@/components/common/sound-toggle';
import { ReactFileManagerDialog } from '@/components/common/react-file-manager-dialog';
import { pickFolder } from '@/components/common/add-repository-button/pick-folder';
import { GitHubImportDialog } from '@/components/common/github-import-dialog';
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

/** Control center route prefixes where the FAB should be visible. */
const CONTROL_CENTER_PREFIXES = ['/', '/create', '/adopt', '/feature', '/repository'];

function isControlCenterRoute(pathname: string): boolean {
  return CONTROL_CENTER_PREFIXES.some(
    (prefix) => pathname === prefix || (prefix !== '/' && pathname.startsWith(`${prefix}/`))
  );
}

function AppShellInner({ children }: AppShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { guardedNavigate } = useDrawerCloseGuard();
  const featureFlags = useFeatureFlags();

  // Subscribe to agent lifecycle events and dispatch toast/browser notifications
  useNotifications();

  const { features, hasRepositories } = useSidebarFeaturesContext();
  const handleNewFeature = useCallback(() => {
    guardedNavigate(() => router.push('/create'));
  }, [router, guardedNavigate]);

  const handleAdoptBranch = useCallback(() => {
    guardedNavigate(() => router.push('/adopt'));
  }, [router, guardedNavigate]);

  const handleFeatureClick = useCallback(
    (featureId: string) => {
      guardedNavigate(() => router.push(`/feature/${featureId}`));
    },
    [router, guardedNavigate]
  );

  const [addingRepo, setAddingRepo] = useState(false);
  const [githubDialogOpen, setGithubDialogOpen] = useState(false);
  const [showReactPicker, setShowReactPicker] = useState(false);

  const handleAddRepository = useCallback(async () => {
    if (addingRepo) return;

    if (featureFlags.reactFileManager) {
      setShowReactPicker(true);
      return;
    }

    setAddingRepo(true);
    try {
      const path = await pickFolder();
      if (path) {
        window.dispatchEvent(new CustomEvent('shep:add-repository', { detail: { path } }));
      }
    } catch {
      // Native picker failed — fall back to React file manager
      setShowReactPicker(true);
    } finally {
      setAddingRepo(false);
    }
  }, [addingRepo, featureFlags.reactFileManager]);

  const handleReactPickerSelect = useCallback((path: string | null) => {
    if (path) {
      window.dispatchEvent(new CustomEvent('shep:add-repository', { detail: { path } }));
    }
    setShowReactPicker(false);
  }, []);

  const handleImportFromGitHub = useCallback(() => {
    setGithubDialogOpen(true);
  }, []);

  const handleGitHubImportComplete = useCallback((repository: { path?: string }) => {
    if (repository.path) {
      window.dispatchEvent(
        new CustomEvent('shep:add-repository', { detail: { path: repository.path } })
      );
    }
  }, []);

  const fabActions: FloatingActionButtonAction[] = useMemo(() => {
    const actions: FloatingActionButtonAction[] = [
      {
        id: 'new-feature',
        label: 'New Feature',
        icon: <Plus className="h-4 w-4" />,
        onClick: handleNewFeature,
      },
      ...(featureFlags.adoptBranch
        ? [
            {
              id: 'adopt-branch',
              label: 'Adopt Branch',
              icon: <GitBranch className="h-4 w-4" />,
              onClick: handleAdoptBranch,
            },
          ]
        : []),
      {
        id: 'add-repository',
        label: 'Add Repository',
        icon: <FolderPlus className="h-4 w-4" />,
        onClick: handleAddRepository,
        loading: addingRepo,
      },
    ];
    if (featureFlags.githubImport) {
      actions.push({
        id: 'import-github',
        label: 'Import from GitHub',
        icon: <Github className="h-4 w-4" />,
        onClick: handleImportFromGitHub,
      });
    }
    return actions;
  }, [
    handleNewFeature,
    handleAdoptBranch,
    handleAddRepository,
    addingRepo,
    handleImportFromGitHub,
    featureFlags.githubImport,
    featureFlags.adoptBranch,
  ]);

  return (
    <SidebarProvider defaultOpen={false}>
      <AppSidebar
        features={features}
        featureFlags={featureFlags}
        onFeatureClick={handleFeatureClick}
      />
      <SidebarInset>
        <div className="relative h-full">
          <div
            className="absolute top-3 right-3 z-50 flex gap-1"
            data-test-id="canvas-actions-toolbar"
          >
            <SoundToggle />
            <ThemeToggle />
          </div>
          <main className="h-full">{children}</main>
          {isControlCenterRoute(pathname) && hasRepositories ? (
            <FloatingActionButton actions={fabActions} />
          ) : null}
          {featureFlags.githubImport ? (
            <GitHubImportDialog
              open={githubDialogOpen}
              onOpenChange={setGithubDialogOpen}
              onImportComplete={handleGitHubImportComplete}
            />
          ) : null}
        </div>
      </SidebarInset>
      <ReactFileManagerDialog
        open={showReactPicker}
        onOpenChange={(open) => {
          if (!open) setShowReactPicker(false);
        }}
        onSelect={handleReactPickerSelect}
      />
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
