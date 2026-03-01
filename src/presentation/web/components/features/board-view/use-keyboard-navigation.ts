'use client';

import { useState, useCallback } from 'react';

export interface BoardGridColumn {
  columnIndex: number;
  count: number;
}

export type BoardGridLayout = BoardGridColumn[];

export interface UseKeyboardNavigationOptions {
  layout: BoardGridLayout;
  onSelect: (columnIndex: number, rowIndex: number) => void;
  onClearSelection: () => void;
}

export interface UseKeyboardNavigationResult {
  focusedColumn: number;
  focusedRow: number;
  setFocus: (column: number, row: number) => void;
  handleKeyDown: (key: string) => void;
  getTabIndex: (column: number, row: number) => number;
}

/**
 * Roving tabindex keyboard navigation for the board grid.
 *
 * - ArrowUp/Down: Navigate within a column
 * - ArrowLeft/Right: Navigate between columns (skips empty ones)
 * - Enter: Select the focused row
 * - Escape: Clear selection and reset focus
 */
export function useKeyboardNavigation({
  layout,
  onSelect,
  onClearSelection,
}: UseKeyboardNavigationOptions): UseKeyboardNavigationResult {
  const [focusedColumn, setFocusedColumn] = useState(-1);
  const [focusedRow, setFocusedRow] = useState(-1);

  const setFocus = useCallback((column: number, row: number) => {
    setFocusedColumn(column);
    setFocusedRow(row);
  }, []);

  const findNextNonEmptyColumn = useCallback(
    (from: number, direction: 1 | -1): number => {
      let idx = from + direction;
      while (idx >= 0 && idx < layout.length) {
        if (layout[idx].count > 0) return idx;
        idx += direction;
      }
      return -1;
    },
    [layout]
  );

  const handleKeyDown = useCallback(
    (key: string) => {
      // If no focus, initialize focus on first arrow key press
      if (focusedColumn === -1 || focusedRow === -1) {
        if (key === 'ArrowDown' || key === 'ArrowUp' || key === 'ArrowRight') {
          const firstCol = layout.findIndex((c) => c.count > 0);
          if (firstCol >= 0) {
            setFocusedColumn(firstCol);
            setFocusedRow(0);
          }
          return;
        }
        if (key === 'Escape') {
          onClearSelection();
          return;
        }
        return;
      }

      const currentCount = layout[focusedColumn]?.count ?? 0;

      switch (key) {
        case 'ArrowDown': {
          if (focusedRow < currentCount - 1) {
            setFocusedRow(focusedRow + 1);
          }
          break;
        }
        case 'ArrowUp': {
          if (focusedRow > 0) {
            setFocusedRow(focusedRow - 1);
          }
          break;
        }
        case 'ArrowRight': {
          const nextCol = findNextNonEmptyColumn(focusedColumn, 1);
          if (nextCol >= 0) {
            setFocusedColumn(nextCol);
            setFocusedRow(Math.min(focusedRow, layout[nextCol].count - 1));
          }
          break;
        }
        case 'ArrowLeft': {
          const prevCol = findNextNonEmptyColumn(focusedColumn, -1);
          if (prevCol >= 0) {
            setFocusedColumn(prevCol);
            setFocusedRow(Math.min(focusedRow, layout[prevCol].count - 1));
          }
          break;
        }
        case 'Enter': {
          onSelect(focusedColumn, focusedRow);
          break;
        }
        case 'Escape': {
          setFocusedColumn(-1);
          setFocusedRow(-1);
          onClearSelection();
          break;
        }
      }
    },
    [focusedColumn, focusedRow, layout, onSelect, onClearSelection, findNextNonEmptyColumn]
  );

  const getTabIndex = useCallback(
    (column: number, row: number): number => {
      return column === focusedColumn && row === focusedRow ? 0 : -1;
    },
    [focusedColumn, focusedRow]
  );

  return {
    focusedColumn,
    focusedRow,
    setFocus,
    handleKeyDown,
    getTabIndex,
  };
}
