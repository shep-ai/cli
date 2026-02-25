'use client';

import { usePathname } from 'next/navigation';
import { Home, Brain, Puzzle, Plus } from 'lucide-react';
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarRail,
  useSidebar,
} from '@/components/ui/sidebar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SidebarNavItem } from '@/components/common/sidebar-nav-item';
import { SidebarCollapseToggle } from '@/components/common/sidebar-collapse-toggle';
import { ShepLogo } from '@/components/common/shep-logo';
import { FeatureListItem } from '@/components/common/feature-list-item';
import { FeatureStatusGroup } from '@/components/common/feature-status-group';
import { SidebarSectionHeader } from '@/components/common/sidebar-section-header';
import { featureStatusConfig, featureStatusOrder } from '@/components/common/feature-status-config';
import type { FeatureStatus } from '@/components/common/feature-status-config';
import { useDeferredMount } from '@/hooks/use-deferred-mount';
import { featureFlags } from '@/lib/feature-flags';

interface FeatureItem {
  name: string;
  status: FeatureStatus;
  startedAt?: number;
  duration?: string;
}

export interface AppSidebarProps {
  features: FeatureItem[];
  onNewFeature?: () => void;
  onFeatureClick?: (name: string) => void;
  onFeaturesFolderClick?: () => void;
  onFeaturesMenuClick?: () => void;
}

export function AppSidebar({
  features,
  onNewFeature,
  onFeatureClick,
  onFeaturesFolderClick,
  onFeaturesMenuClick,
}: AppSidebarProps) {
  const pathname = usePathname();
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const { mounted: showExpanded, visible: expandedVisible } = useDeferredMount(collapsed, 200);

  const grouped = featureStatusOrder.map((key) => {
    const { label } = featureStatusConfig[key];
    const items = features.filter((f) => f.status === key);
    return { key, label, items };
  });

  return (
    <Sidebar data-testid="app-sidebar" collapsible="icon">
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
                  <ShepLogo className="shrink-0" size={20} />
                  <span className="truncate text-sm font-semibold tracking-tight">Shep</span>
                </div>
              ) : null}
              <SidebarCollapseToggle className="shrink-0 transition-all duration-200" />
            </div>
          </SidebarMenuItem>

          <SidebarNavItem icon={Home} label="Control Center" href="/" active={pathname === '/'} />
          <SidebarNavItem
            icon={Brain}
            label="Memory"
            href="/memory"
            active={pathname === '/memory'}
          />
          {featureFlags.skills ? (
            <SidebarNavItem
              icon={Puzzle}
              label="Skills"
              href="/skills"
              active={pathname === '/skills'}
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
            <SidebarSectionHeader
              label="Features"
              onFolderClick={onFeaturesFolderClick}
              onMenuClick={onFeaturesMenuClick}
            />
            <ScrollArea>
              {grouped.map(({ key, label, items }) =>
                items.length > 0 ? (
                  <FeatureStatusGroup key={key} label={label} count={items.length}>
                    {items.map((feature) => (
                      <FeatureListItem
                        key={feature.name}
                        name={feature.name}
                        status={feature.status}
                        startedAt={feature.startedAt}
                        duration={feature.duration}
                        onClick={onFeatureClick ? () => onFeatureClick(feature.name) : undefined}
                      />
                    ))}
                  </FeatureStatusGroup>
                ) : null
              )}
            </ScrollArea>
          </div>
        ) : null}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={onNewFeature} tooltip="New feature">
              <Plus />
              <span>New feature</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
