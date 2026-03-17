'use client';

import { usePathname } from 'next/navigation';
import { Home, Wrench, Puzzle, Settings, Database } from 'lucide-react';
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from '@/components/ui/sidebar';

import { ScrollArea } from '@/components/ui/scroll-area';
import { SidebarNavItem } from '@/components/common/sidebar-nav-item';
import { SidebarCollapseToggle } from '@/components/common/sidebar-collapse-toggle';
import { ShepLogo } from '@/components/common/shep-logo';
import { VersionBadge } from '@/components/common/version-badge';
import { FeatureListItem } from '@/components/common/feature-list-item';
import { FeatureStatusGroup } from '@/components/common/feature-status-group';
import { SidebarSectionHeader } from '@/components/common/sidebar-section-header';
import { featureStatusConfig, featureStatusOrder } from '@/components/common/feature-status-config';
import type { FeatureStatus } from '@/components/common/feature-status-config';
import { useDeferredMount } from '@/hooks/use-deferred-mount';
import { useVersion } from '@/hooks/use-version';
import type { FeatureFlagsState } from '@/lib/feature-flags';

export interface FeatureItem {
  featureId: string;
  name: string;
  status: FeatureStatus;
  startedAt?: number;
  duration?: string;
  agentType?: string;
  modelId?: string;
}

export interface AppSidebarProps {
  features: FeatureItem[];
  featureFlags: FeatureFlagsState;

  onFeatureClick?: (featureId: string) => void;
}

export function AppSidebar({
  features,
  featureFlags,

  onFeatureClick,
}: AppSidebarProps) {
  const pathname = usePathname();
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const { mounted: showExpanded, visible: expandedVisible } = useDeferredMount(collapsed, 200);
  const versionData = useVersion();

  const grouped = featureStatusOrder.map((key) => {
    const { label } = featureStatusConfig[key];
    const items = features.filter((f) => f.status === key);
    return { key, label, items };
  });

  return (
    <Sidebar data-testid="app-sidebar" data-no-drawer-close collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex h-8 items-center group-data-[collapsible=icon]:justify-center">
              {showExpanded ? (
                <div
                  className={[
                    'flex min-w-0 flex-1 items-center gap-2 overflow-hidden px-2',
                    'transition-opacity duration-200 ease-out',
                    expandedVisible ? 'opacity-100' : 'opacity-0',
                  ].join(' ')}
                  aria-hidden={!expandedVisible}
                >
                  <ShepLogo
                    className="shrink-0"
                    size={20}
                    variant={versionData.isDev ? 'dev' : 'default'}
                  />
                  <span className="truncate text-sm font-semibold tracking-tight">Shep</span>
                  <VersionBadge
                    version={versionData.version}
                    branch={versionData.branch || undefined}
                    commitHash={versionData.commitHash || undefined}
                    isDev={versionData.isDev}
                    packageName={versionData.packageName}
                    description={versionData.description}
                    instancePath={versionData.instancePath || undefined}
                  />
                </div>
              ) : null}
              <SidebarCollapseToggle className="shrink-0 transition-all duration-200" />
            </div>
          </SidebarMenuItem>

          <SidebarNavItem icon={Home} label="Control Center" href="/" active={pathname === '/'} />
          <SidebarNavItem
            icon={Wrench}
            label="Tools"
            href="/tools"
            active={pathname === '/tools'}
          />
          {featureFlags.skills ? (
            <SidebarNavItem
              icon={Puzzle}
              label="Skills"
              href="/skills"
              active={pathname === '/skills'}
            />
          ) : null}
          <SidebarNavItem
            icon={Settings}
            label="Settings"
            href="/settings"
            active={pathname === '/settings'}
          />
          {featureFlags.databaseBrowser ? (
            <SidebarNavItem
              icon={Database}
              label="Database"
              href="/database"
              active={pathname === '/database'}
            />
          ) : null}
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {showExpanded ? (
          <div
            className={[
              'min-w-0 overflow-hidden transition-opacity duration-200 ease-out',
              '[&_[data-sidebar=group-label]]:!mt-0 [&_[data-sidebar=group-label]]:!opacity-100 [&_[data-sidebar=group-label]]:!transition-none',
              expandedVisible ? 'opacity-100' : 'opacity-0',
            ].join(' ')}
          >
            <SidebarSectionHeader label="Features" />
            <ScrollArea>
              {grouped.map(({ key, label, items }) =>
                items.length > 0 ? (
                  <FeatureStatusGroup key={key} label={label} count={items.length}>
                    {items.map((feature) => (
                      <FeatureListItem
                        key={feature.featureId}
                        name={feature.name}
                        status={feature.status}
                        startedAt={feature.startedAt}
                        duration={feature.duration}
                        agentType={feature.agentType}
                        modelId={feature.modelId}
                        onClick={
                          onFeatureClick ? () => onFeatureClick(feature.featureId) : undefined
                        }
                      />
                    ))}
                  </FeatureStatusGroup>
                ) : null
              )}
            </ScrollArea>
          </div>
        ) : null}
      </SidebarContent>

      <SidebarRail />
    </Sidebar>
  );
}
