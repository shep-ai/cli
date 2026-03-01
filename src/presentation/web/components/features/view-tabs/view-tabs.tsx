'use client';

import { useCallback, type ReactNode } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { LayoutGrid, Network } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export const VIEW_PARAM = 'view';
export type ViewTabValue = 'board' | 'map';

const VALID_VIEWS: ViewTabValue[] = ['board', 'map'];
const DEFAULT_VIEW: ViewTabValue = 'board';

export interface ViewTabsProps {
  boardContent: ReactNode;
  mapContent: ReactNode;
}

export function ViewTabs({ boardContent, mapContent }: ViewTabsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const rawView = searchParams.get(VIEW_PARAM);
  const activeTab: ViewTabValue =
    rawView && VALID_VIEWS.includes(rawView as ViewTabValue)
      ? (rawView as ViewTabValue)
      : DEFAULT_VIEW;

  const handleTabChange = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set(VIEW_PARAM, value);
      router.replace(`${pathname}?${params.toString()}`);
    },
    [router, searchParams, pathname]
  );

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange} className="flex h-full flex-col">
      <div className="flex items-center px-4 pt-2">
        <TabsList>
          <TabsTrigger value="board" className="gap-1.5">
            <LayoutGrid className="h-4 w-4" />
            Board
          </TabsTrigger>
          <TabsTrigger value="map" className="gap-1.5">
            <Network className="h-4 w-4" />
            Map
          </TabsTrigger>
        </TabsList>
      </div>
      <TabsContent value="board" className="mt-0 flex-1 overflow-hidden">
        {boardContent}
      </TabsContent>
      <TabsContent value="map" className="mt-0 flex-1 overflow-hidden">
        {mapContent}
      </TabsContent>
    </Tabs>
  );
}
