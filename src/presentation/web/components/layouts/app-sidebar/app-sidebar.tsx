'use client';

import { Home, Brain, Plus } from 'lucide-react';
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
} from '@/components/ui/sidebar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { SidebarNavItem } from '@/components/common/sidebar-nav-item';
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
  const grouped = statusGroups.map(({ key, label }) => {
    const items = features.filter((f) => f.status === key);
    return { key, label, items };
  });

  return (
    <Sidebar>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarNavItem icon={Home} label="Control Center" href="/" />
          <SidebarNavItem icon={Brain} label="Memory" href="/memory" />
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <ScrollArea>
          <SidebarGroup>
            <SidebarGroupLabel>Features</SidebarGroupLabel>
            <SidebarGroupContent>
              {grouped.map(
                ({ key, label, items }) =>
                  items.length > 0 && (
                    <FeatureStatusGroup key={key} label={label} count={items.length}>
                      <SidebarMenu>
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
                      </SidebarMenu>
                    </FeatureStatusGroup>
                  )
              )}
            </SidebarGroupContent>
          </SidebarGroup>
        </ScrollArea>
      </SidebarContent>

      <SidebarFooter>
        <Button onClick={onNewFeature} className="w-full">
          <Plus />
          New feature
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
