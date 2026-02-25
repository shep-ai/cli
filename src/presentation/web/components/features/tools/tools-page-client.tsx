'use client';

import { useState } from 'react';
import { Wrench } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { ToolCard } from './tool-card';
import type { ToolItem } from '@shepai/core/application/use-cases/tools/list-tools.use-case';

export interface ToolsPageClientProps {
  tools: ToolItem[];
  className?: string;
}

type TabValue = 'all' | 'ide' | 'cli-agent';

const TAB_FILTER: Record<TabValue, (tool: ToolItem) => boolean> = {
  all: () => true,
  ide: (tool) => tool.tags.includes('ide'),
  'cli-agent': (tool) => tool.tags.includes('cli-agent'),
};

export function ToolsPageClient({ tools: initialTools, className }: ToolsPageClientProps) {
  const [tools, setTools] = useState<ToolItem[]>(initialTools);
  const [activeTab, setActiveTab] = useState<TabValue>('all');

  async function refreshTools() {
    try {
      const res = await fetch('/api/tools');
      if (res.ok) {
        const updated = (await res.json()) as ToolItem[];
        setTools(updated);
      }
    } catch {
      // Silently ignore refresh errors; user can re-navigate to refresh
    }
  }

  const filtered = tools.filter(TAB_FILTER[activeTab]);

  return (
    <div data-testid="tools-page-client" className={cn('space-y-6', className)}>
      <div className="flex items-center gap-3">
        <Wrench className="text-primary h-6 w-6" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tools</h1>
          <p className="text-muted-foreground text-sm">
            Manage the IDEs and CLI agents used by Shep.
          </p>
        </div>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as TabValue)}
        data-testid="tools-page-tabs"
      >
        <TabsList>
          <TabsTrigger value="all" data-testid="tools-tab-all">
            All ({tools.length})
          </TabsTrigger>
          <TabsTrigger value="ide" data-testid="tools-tab-ide">
            IDEs ({tools.filter(TAB_FILTER.ide).length})
          </TabsTrigger>
          <TabsTrigger value="cli-agent" data-testid="tools-tab-cli-agent">
            CLI Agents ({tools.filter(TAB_FILTER['cli-agent']).length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {filtered.length === 0 ? (
            <div
              data-testid="tools-page-empty"
              className="text-muted-foreground flex flex-col items-center justify-center py-16 text-center"
            >
              <Wrench className="mb-3 h-10 w-10 opacity-30" />
              <p className="text-sm">No tools found in this category.</p>
            </div>
          ) : (
            <div
              data-testid="tools-page-grid"
              className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
            >
              {filtered.map((tool) => (
                <ToolCard key={tool.id} tool={tool} onRefresh={refreshTools} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
