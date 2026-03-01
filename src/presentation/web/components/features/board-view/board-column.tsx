'use client';

import { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { FeatureNodeData } from '@/components/common/feature-node';
import type { BoardColumnId } from '@/lib/build-board-data';
import { ColumnHeader } from './column-header';
import { BoardRow } from './board-row';

/** Columns with more than this many items use virtual scrolling. */
export const VIRTUALIZATION_THRESHOLD = 30;

/** Estimated row height in pixels for the virtualizer. */
const ESTIMATED_ROW_HEIGHT = 56;

export interface BoardColumnProps {
  label: string;
  columnId: BoardColumnId;
  columnIndex?: number;
  features: FeatureNodeData[];
  selectedFeatureId?: string;
  onSelect?: (data: FeatureNodeData) => void;
  onDetails?: (data: FeatureNodeData) => void;
  getTabIndex?: (column: number, row: number) => number;
}

function VirtualizedRows({
  features,
  selectedFeatureId,
  columnIndex,
  onSelect,
  onDetails,
  getTabIndex,
}: {
  features: FeatureNodeData[];
  selectedFeatureId?: string;
  columnIndex: number;
  onSelect?: (data: FeatureNodeData) => void;
  onDetails?: (data: FeatureNodeData) => void;
  getTabIndex?: (column: number, row: number) => number;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: features.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ESTIMATED_ROW_HEIGHT,
    overscan: 5,
  });

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto px-1">
      <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
        {virtualizer.getVirtualItems().map((virtualItem) => {
          const feature = features[virtualItem.index];
          return (
            <div
              key={feature.featureId}
              data-index={virtualItem.index}
              ref={virtualizer.measureElement}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              <BoardRow
                data={feature}
                isSelected={feature.featureId === selectedFeatureId}
                tabIndex={getTabIndex?.(columnIndex, virtualItem.index) ?? -1}
                onSelect={onSelect}
                onDetails={onDetails}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SimpleRows({
  features,
  selectedFeatureId,
  columnIndex,
  onSelect,
  onDetails,
  getTabIndex,
}: {
  features: FeatureNodeData[];
  selectedFeatureId?: string;
  columnIndex: number;
  onSelect?: (data: FeatureNodeData) => void;
  onDetails?: (data: FeatureNodeData) => void;
  getTabIndex?: (column: number, row: number) => number;
}) {
  return (
    <div className="flex-1 overflow-y-auto px-1">
      {features.map((feature, rowIdx) => (
        <BoardRow
          key={feature.featureId}
          data={feature}
          isSelected={feature.featureId === selectedFeatureId}
          tabIndex={getTabIndex?.(columnIndex, rowIdx) ?? -1}
          onSelect={onSelect}
          onDetails={onDetails}
        />
      ))}
    </div>
  );
}

export function BoardColumn({
  label,
  columnId,
  columnIndex = 0,
  features,
  selectedFeatureId,
  onSelect,
  onDetails,
  getTabIndex,
}: BoardColumnProps) {
  const useVirtual = features.length > VIRTUALIZATION_THRESHOLD;

  return (
    <div
      data-column-id={columnId}
      data-board-col={columnIndex}
      className="bg-muted/30 flex min-h-0 flex-col rounded-lg border"
    >
      <ColumnHeader label={label} count={features.length} />

      <div role="listbox" aria-label={label} className="flex min-h-0 flex-1 flex-col">
        {useVirtual ? (
          <VirtualizedRows
            features={features}
            selectedFeatureId={selectedFeatureId}
            columnIndex={columnIndex}
            onSelect={onSelect}
            onDetails={onDetails}
            getTabIndex={getTabIndex}
          />
        ) : (
          <SimpleRows
            features={features}
            selectedFeatureId={selectedFeatureId}
            columnIndex={columnIndex}
            onSelect={onSelect}
            onDetails={onDetails}
            getTabIndex={getTabIndex}
          />
        )}
      </div>
    </div>
  );
}
