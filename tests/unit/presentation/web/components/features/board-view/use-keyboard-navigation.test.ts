import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  useKeyboardNavigation,
  type BoardGridLayout,
} from '@/components/features/board-view/use-keyboard-navigation';

function createLayout(columnSizes: number[]): BoardGridLayout {
  return columnSizes.map((count, colIdx) => ({
    columnIndex: colIdx,
    count,
  }));
}

describe('useKeyboardNavigation', () => {
  const onSelect = vi.fn();
  const onClearSelection = vi.fn();

  beforeEach(() => {
    onSelect.mockReset();
    onClearSelection.mockReset();
  });

  it('initializes with no focus (col -1, row -1)', () => {
    const layout = createLayout([5, 3, 2, 4, 1]);
    const { result } = renderHook(() =>
      useKeyboardNavigation({ layout, onSelect, onClearSelection })
    );

    expect(result.current.focusedColumn).toBe(-1);
    expect(result.current.focusedRow).toBe(-1);
  });

  it('ArrowDown moves focus to next row in same column', () => {
    const layout = createLayout([5, 3, 2, 4, 1]);
    const { result } = renderHook(() =>
      useKeyboardNavigation({ layout, onSelect, onClearSelection })
    );

    // Set initial focus
    act(() => result.current.setFocus(0, 0));
    expect(result.current.focusedRow).toBe(0);

    act(() => result.current.handleKeyDown('ArrowDown'));
    expect(result.current.focusedColumn).toBe(0);
    expect(result.current.focusedRow).toBe(1);
  });

  it('ArrowUp moves focus to previous row in same column', () => {
    const layout = createLayout([5, 3]);
    const { result } = renderHook(() =>
      useKeyboardNavigation({ layout, onSelect, onClearSelection })
    );

    act(() => result.current.setFocus(0, 2));
    act(() => result.current.handleKeyDown('ArrowUp'));

    expect(result.current.focusedColumn).toBe(0);
    expect(result.current.focusedRow).toBe(1);
  });

  it('ArrowDown does not go past last row', () => {
    const layout = createLayout([3]);
    const { result } = renderHook(() =>
      useKeyboardNavigation({ layout, onSelect, onClearSelection })
    );

    act(() => result.current.setFocus(0, 2)); // last row
    act(() => result.current.handleKeyDown('ArrowDown'));

    expect(result.current.focusedRow).toBe(2); // stays at last
  });

  it('ArrowUp does not go before first row', () => {
    const layout = createLayout([3]);
    const { result } = renderHook(() =>
      useKeyboardNavigation({ layout, onSelect, onClearSelection })
    );

    act(() => result.current.setFocus(0, 0));
    act(() => result.current.handleKeyDown('ArrowUp'));

    expect(result.current.focusedRow).toBe(0); // stays at first
  });

  it('ArrowRight moves focus to same-index row in next column', () => {
    const layout = createLayout([5, 3, 4]);
    const { result } = renderHook(() =>
      useKeyboardNavigation({ layout, onSelect, onClearSelection })
    );

    act(() => result.current.setFocus(0, 1));
    act(() => result.current.handleKeyDown('ArrowRight'));

    expect(result.current.focusedColumn).toBe(1);
    expect(result.current.focusedRow).toBe(1);
  });

  it('ArrowRight clamps row to nearest when target column is shorter', () => {
    const layout = createLayout([5, 2]);
    const { result } = renderHook(() =>
      useKeyboardNavigation({ layout, onSelect, onClearSelection })
    );

    act(() => result.current.setFocus(0, 4)); // row 4 in col 0
    act(() => result.current.handleKeyDown('ArrowRight'));

    expect(result.current.focusedColumn).toBe(1);
    expect(result.current.focusedRow).toBe(1); // clamped to last in col 1
  });

  it('ArrowLeft moves focus to previous column', () => {
    const layout = createLayout([5, 3]);
    const { result } = renderHook(() =>
      useKeyboardNavigation({ layout, onSelect, onClearSelection })
    );

    act(() => result.current.setFocus(1, 1));
    act(() => result.current.handleKeyDown('ArrowLeft'));

    expect(result.current.focusedColumn).toBe(0);
    expect(result.current.focusedRow).toBe(1);
  });

  it('ArrowRight skips empty columns', () => {
    const layout = createLayout([3, 0, 4]);
    const { result } = renderHook(() =>
      useKeyboardNavigation({ layout, onSelect, onClearSelection })
    );

    act(() => result.current.setFocus(0, 1));
    act(() => result.current.handleKeyDown('ArrowRight'));

    expect(result.current.focusedColumn).toBe(2); // skips empty col 1
    expect(result.current.focusedRow).toBe(1);
  });

  it('ArrowLeft skips empty columns', () => {
    const layout = createLayout([3, 0, 4]);
    const { result } = renderHook(() =>
      useKeyboardNavigation({ layout, onSelect, onClearSelection })
    );

    act(() => result.current.setFocus(2, 1));
    act(() => result.current.handleKeyDown('ArrowLeft'));

    expect(result.current.focusedColumn).toBe(0); // skips empty col 1
    expect(result.current.focusedRow).toBe(1);
  });

  it('Enter calls onSelect for focused row', () => {
    const layout = createLayout([3, 2]);
    const { result } = renderHook(() =>
      useKeyboardNavigation({ layout, onSelect, onClearSelection })
    );

    act(() => result.current.setFocus(1, 0));
    act(() => result.current.handleKeyDown('Enter'));

    expect(onSelect).toHaveBeenCalledWith(1, 0);
  });

  it('Escape calls onClearSelection and resets focus', () => {
    const layout = createLayout([3]);
    const { result } = renderHook(() =>
      useKeyboardNavigation({ layout, onSelect, onClearSelection })
    );

    act(() => result.current.setFocus(0, 1));
    act(() => result.current.handleKeyDown('Escape'));

    expect(onClearSelection).toHaveBeenCalled();
    expect(result.current.focusedColumn).toBe(-1);
    expect(result.current.focusedRow).toBe(-1);
  });

  it('only focused element has tabindex "0"', () => {
    const layout = createLayout([3, 2]);
    const { result } = renderHook(() =>
      useKeyboardNavigation({ layout, onSelect, onClearSelection })
    );

    act(() => result.current.setFocus(0, 1));

    expect(result.current.getTabIndex(0, 0)).toBe(-1);
    expect(result.current.getTabIndex(0, 1)).toBe(0);
    expect(result.current.getTabIndex(0, 2)).toBe(-1);
    expect(result.current.getTabIndex(1, 0)).toBe(-1);
  });

  it('ArrowDown when unfocused focuses first row of first non-empty column', () => {
    const layout = createLayout([0, 3, 2]);
    const { result } = renderHook(() =>
      useKeyboardNavigation({ layout, onSelect, onClearSelection })
    );

    act(() => result.current.handleKeyDown('ArrowDown'));

    expect(result.current.focusedColumn).toBe(1); // first non-empty
    expect(result.current.focusedRow).toBe(0);
  });
});
