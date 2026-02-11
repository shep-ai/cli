'use client';

import { Home, Brain, Plus, Layers } from 'lucide-react';
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
import type { FeatureStatus } from '@/components/common/feature-list-item';

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
}

const statusGroups: { key: FeatureStatus; label: string }[] = [
  { key: 'action-needed', label: 'Action Needed' },
  { key: 'in-progress', label: 'In Progress' },
  { key: 'done', label: 'Done' },
];

export function AppSidebar({ features, onNewFeature, onFeatureClick }: AppSidebarProps) {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';

  const grouped = statusGroups.map(({ key, label }) => {
    const items = features.filter((f) => f.status === key);
    return { key, label, items };
  });

  return (
    <Sidebar data-testid="app-sidebar" collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex h-8 items-center group-data-[collapsible=icon]:justify-center">
              <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden px-2 transition-opacity duration-200 group-data-[collapsible=icon]:w-0 group-data-[collapsible=icon]:flex-none group-data-[collapsible=icon]:overflow-hidden group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:opacity-0">
                <ShepLogo className="shrink-0" size={20} />
                <span className="truncate text-sm font-semibold tracking-tight">Shep</span>
              </div>
              <SidebarCollapseToggle className="shrink-0 transition-all duration-200" />
            </div>
          </SidebarMenuItem>
          <SidebarNavItem icon={Home} label="Control Center" href="/" />
          <SidebarNavItem icon={Brain} label="Memory" href="/memory" />
          <SidebarNavItem icon={Layers} label="Features" href="/features" />
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {!collapsed && (
          <ScrollArea>
            {grouped.map(
              ({ key, label, items }) =>
                items.length > 0 && (
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
                )
            )}
          </ScrollArea>
        )}
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
