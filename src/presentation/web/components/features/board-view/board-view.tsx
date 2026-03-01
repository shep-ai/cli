'use client';

import { useCallback, useRef, type ReactNode } from 'react';
import type { FeatureNodeData } from '@/components/common/feature-node';
import type { FilterState } from '@/hooks/use-filter-state';
import { BOARD_COLUMNS } from '@/lib/build-board-data';
import { BoardColumn } from './board-column';
import { useBoardState } from './use-board-state';
import { useKeyboardNavigation } from './use-keyboard-navigation';

// eslint-disable-next-line @typescript-eslint/no-empty-function
const noop = () => {};

export interface BoardViewProps {
  features: FeatureNodeData[];
  filters: FilterState;
  selectedFeatureId?: string;
  onSelect?: (data: FeatureNodeData) => void;
  onDetails?: (data: FeatureNodeData) => void;
  onClearSelection?: () => void;
  filterBar?: ReactNode;
}

export function BoardView({
  features,
  filters,
  selectedFeatureId,
  onSelect,
  onDetails,
  onClearSelection,
  filterBar,
}: BoardViewProps) {
  const { columns } = useBoardState({ features, filters });
  const boardRef = useRef<HTMLDivElement>(null);

  // Build layout descriptor for keyboard navigation
  const layout = BOARD_COLUMNS.map((col, idx) => ({
    columnIndex: idx,
    count: columns.get(col.id)?.length ?? 0,
  }));

  const handleNavSelect = useCallback(
    (columnIndex: number, rowIndex: number) => {
      const col = BOARD_COLUMNS[columnIndex];
      if (!col) return;
      const colFeatures = columns.get(col.id);
      const feature = colFeatures?.[rowIndex];
      if (feature) onSelect?.(feature);
    },
    [columns, onSelect]
  );

  const keyboard = useKeyboardNavigation({
    layout,
    onSelect: handleNavSelect,
    onClearSelection: onClearSelection ?? noop,
  });

  const handleBoardKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const navigableKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', 'Escape'];
      if (navigableKeys.includes(e.key)) {
        e.preventDefault();
        keyboard.handleKeyDown(e.key);

        // Focus the target element after state update
        requestAnimationFrame(() => {
          if (keyboard.focusedColumn >= 0 && keyboard.focusedRow >= 0) {
            const el = boardRef.current?.querySelector(
              `[data-board-col="${keyboard.focusedColumn}"] [data-board-row="${keyboard.focusedRow}"]`
            ) as HTMLElement | null;
            el?.focus();
          }
        });
      }
    },
    [keyboard]
  );

  return (
    <div className="flex h-full flex-col gap-2 p-4">
      {filterBar}

      <div
        ref={boardRef}
        data-testid="board-view-grid"
        className="grid min-h-0 flex-1 gap-3"
        style={{ gridTemplateColumns: 'repeat(5, minmax(180px, 1fr))' }}
        onKeyDown={handleBoardKeyDown}
      >
        {BOARD_COLUMNS.map((col, colIdx) => (
          <BoardColumn
            key={col.id}
            label={col.label}
            columnId={col.id}
            columnIndex={colIdx}
            features={columns.get(col.id) ?? []}
            selectedFeatureId={selectedFeatureId}
            onSelect={onSelect}
            onDetails={onDetails}
            getTabIndex={keyboard.getTabIndex}
          />
        ))}
      </div>
    </div>
  );
}
