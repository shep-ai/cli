'use client';

import { Home, Brain, Plus } from 'lucide-react';
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarRail,
  useSidebar,
} from '@/components/ui/sidebar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SidebarNavItem } from '@/components/common/sidebar-nav-item';
import { FeatureListItem } from '@/components/common/feature-list-item';
import { FeatureStatusGroup } from '@/components/common/feature-status-group';
import { FeatureStatusBadges } from '@/components/common/feature-status-badges';
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

  const counts = statusGroups.reduce(
    (acc, { key }) => {
      acc[key] = features.filter((f) => f.status === key).length;
      return acc;
    },
    {} as Record<FeatureStatus, number>
  );

  return (
    <Sidebar data-testid="app-sidebar" collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarNavItem icon={Home} label="Control Center" href="/" />
          <SidebarNavItem icon={Brain} label="Memory" href="/memory" />
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {collapsed ? (
          <FeatureStatusBadges counts={counts} />
        ) : (
          <ScrollArea>
            <SidebarGroup className="py-1">
              <SidebarGroupLabel>Features</SidebarGroupLabel>
              <SidebarGroupContent>
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
                            onClick={
                              onFeatureClick ? () => onFeatureClick(feature.name) : undefined
                            }
                          />
                        ))}
                      </FeatureStatusGroup>
                    )
                )}
              </SidebarGroupContent>
            </SidebarGroup>
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
