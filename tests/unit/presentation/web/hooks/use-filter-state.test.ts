import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// --- Mocks ---

const mockReplace = vi.fn();
let mockSearchParams = new URLSearchParams();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace }),
  useSearchParams: () => mockSearchParams,
  usePathname: () => '/',
}));

import { useFilterState } from '@/hooks/use-filter-state';

describe('useFilterState', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams = new URLSearchParams();
  });

  it('initial state with no URL params returns empty filter sets', () => {
    const { result } = renderHook(() => useFilterState());

    expect(result.current.filters.lifecycle.size).toBe(0);
    expect(result.current.filters.status.size).toBe(0);
    expect(result.current.filters.agentType.size).toBe(0);
    expect(result.current.filters.repository.size).toBe(0);
    expect(result.current.hasActiveFilters).toBe(false);
  });

  it('initial state with URL params populates correct filter sets', () => {
    mockSearchParams = new URLSearchParams('status=running,blocked&lifecycle=implementation');

    const { result } = renderHook(() => useFilterState());

    expect(result.current.filters.status).toEqual(new Set(['running', 'blocked']));
    expect(result.current.filters.lifecycle).toEqual(new Set(['implementation']));
    expect(result.current.filters.agentType.size).toBe(0);
    expect(result.current.filters.repository.size).toBe(0);
    expect(result.current.hasActiveFilters).toBe(true);
  });

  it('toggleFilter adds value to set and updates URL', () => {
    const { result } = renderHook(() => useFilterState());

    act(() => {
      result.current.toggleFilter('status', 'running');
    });

    expect(result.current.filters.status).toEqual(new Set(['running']));
    expect(mockReplace).toHaveBeenCalledWith(expect.stringContaining('status=running'));
  });

  it('toggleFilter removes value when already present', () => {
    mockSearchParams = new URLSearchParams('status=running');

    const { result } = renderHook(() => useFilterState());

    act(() => {
      result.current.toggleFilter('status', 'running');
    });

    expect(result.current.filters.status.size).toBe(0);
    // URL should not contain status param when empty
    expect(mockReplace).toHaveBeenCalled();
    const calledUrl = mockReplace.mock.calls[0][0] as string;
    expect(calledUrl).not.toContain('status=');
  });

  it('toggleFilter handles multiple values in same dimension', () => {
    const { result } = renderHook(() => useFilterState());

    act(() => {
      result.current.toggleFilter('status', 'running');
    });
    act(() => {
      result.current.toggleFilter('status', 'blocked');
    });

    expect(result.current.filters.status).toEqual(new Set(['running', 'blocked']));
  });

  it('clearFilter empties a specific dimension', () => {
    mockSearchParams = new URLSearchParams('status=running,blocked&lifecycle=implementation');

    const { result } = renderHook(() => useFilterState());

    act(() => {
      result.current.clearFilter('status');
    });

    expect(result.current.filters.status.size).toBe(0);
    expect(result.current.filters.lifecycle.size).toBe(1); // Unchanged
  });

  it('clearAllFilters resets all dimensions and clears URL params', () => {
    mockSearchParams = new URLSearchParams(
      'status=running&lifecycle=implementation&agentType=claude-code'
    );

    const { result } = renderHook(() => useFilterState());

    act(() => {
      result.current.clearAllFilters();
    });

    expect(result.current.filters.status.size).toBe(0);
    expect(result.current.filters.lifecycle.size).toBe(0);
    expect(result.current.filters.agentType.size).toBe(0);
    expect(result.current.filters.repository.size).toBe(0);
    expect(result.current.hasActiveFilters).toBe(false);
    expect(mockReplace).toHaveBeenCalled();
  });

  it('hasActiveFilters returns true when any filter is set', () => {
    const { result } = renderHook(() => useFilterState());

    expect(result.current.hasActiveFilters).toBe(false);

    act(() => {
      result.current.toggleFilter('agentType', 'claude-code');
    });

    expect(result.current.hasActiveFilters).toBe(true);
  });

  it('preserves non-filter URL params (like view)', () => {
    mockSearchParams = new URLSearchParams('view=board&status=running');

    const { result } = renderHook(() => useFilterState());

    act(() => {
      result.current.toggleFilter('lifecycle', 'implementation');
    });

    const calledUrl = mockReplace.mock.calls[0][0] as string;
    expect(calledUrl).toContain('view=board');
    expect(calledUrl).toContain('lifecycle=implementation');
  });

  it('empty filter dimensions are omitted from URL', () => {
    const { result } = renderHook(() => useFilterState());

    act(() => {
      result.current.toggleFilter('status', 'running');
    });

    const calledUrl = mockReplace.mock.calls[0][0] as string;
    expect(calledUrl).toContain('status=running');
    expect(calledUrl).not.toContain('lifecycle=');
    expect(calledUrl).not.toContain('agentType=');
    expect(calledUrl).not.toContain('repository=');
  });
});
