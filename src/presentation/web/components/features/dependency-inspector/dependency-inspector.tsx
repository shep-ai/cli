'use client';

import { useCallback, useMemo, useState } from 'react';
import { PanelRightClose, PanelRightOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FeatureNodeData } from '@/components/common/feature-node';
import { DependencyList } from './dependency-list';
import { DependencyMiniGraph } from './dependency-mini-graph';

const STORAGE_KEY = 'shep:inspector-collapsed';

export interface DependencyInspectorProps {
  selectedFeature: FeatureNodeData | null;
  allFeatures: FeatureNodeData[];
  /** Map of featureId → parentId for dependency traversal */
  parentIdMap: Record<string, string>;
  onFeatureSelect?: (featureId: string) => void;
}

function readCollapsedState(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function DependencyInspector({
  selectedFeature,
  allFeatures,
  parentIdMap,
  onFeatureSelect,
}: DependencyInspectorProps) {
  const [isCollapsed, setIsCollapsed] = useState(readCollapsedState);

  const toggleCollapsed = useCallback(() => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, String(next));
      } catch {
        // Ignore storage errors
      }
      return next;
    });
  }, []);

  // Derive upstream (parents) and downstream (children) dependencies
  const upstream = useMemo(() => {
    if (!selectedFeature) return [];
    const parentId = parentIdMap[selectedFeature.featureId];
    if (!parentId) return [];
    const parent = allFeatures.find((f) => f.featureId === parentId);
    return parent ? [parent] : [];
  }, [selectedFeature, allFeatures, parentIdMap]);

  const downstream = useMemo(() => {
    if (!selectedFeature) return [];
    return allFeatures.filter((f) => parentIdMap[f.featureId] === selectedFeature.featureId);
  }, [selectedFeature, allFeatures, parentIdMap]);

  if (!selectedFeature) return null;

  return (
    <div
      data-testid="dependency-inspector"
      className={cn(
        'bg-background border-l transition-[width] duration-200 ease-in-out',
        isCollapsed ? 'w-10 overflow-hidden' : 'w-80 overflow-hidden'
      )}
    >
      {/* Collapse / Expand toggle */}
      <div className="flex items-center justify-end border-b px-2 py-1.5">
        <button
          type="button"
          onClick={toggleCollapsed}
          aria-label={isCollapsed ? 'Expand inspector' : 'Collapse inspector'}
          className="text-muted-foreground hover:text-foreground flex h-7 w-7 items-center justify-center rounded-md transition-colors"
        >
          {isCollapsed ? (
            <PanelRightOpen className="h-4 w-4" />
          ) : (
            <PanelRightClose className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Panel content — hidden when collapsed via parent overflow:hidden + width:40px */}
      <div className="flex flex-col gap-4 overflow-y-auto p-3" hidden={isCollapsed}>
        {/* Feature name header */}
        <div>
          <h3 className="truncate text-sm font-semibold">{selectedFeature.name}</h3>
          <p className="text-muted-foreground text-xs">Dependencies</p>
        </div>

        {/* Mini graph */}
        <DependencyMiniGraph
          selectedFeature={selectedFeature}
          allFeatures={allFeatures}
          parentIdMap={parentIdMap}
          onFeatureSelect={onFeatureSelect}
        />

        {/* Upstream dependencies */}
        <DependencyList direction="upstream" items={upstream} onSelect={onFeatureSelect} />

        {/* Downstream dependencies */}
        <DependencyList direction="downstream" items={downstream} onSelect={onFeatureSelect} />
      </div>
    </div>
  );
}
