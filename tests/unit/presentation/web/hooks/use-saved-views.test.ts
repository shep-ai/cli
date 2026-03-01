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

import { useSavedViews, type SavedView } from '@/hooks/use-saved-views';

const STORAGE_KEY = 'shep:saved-views';

// The test setup.ts replaces localStorage with vi.fn() stubs.
// We need a proper backing store for these tests.
let store: Map<string, string>;

function setupLocalStorage() {
  store = new Map();
  (localStorage.getItem as ReturnType<typeof vi.fn>).mockImplementation(
    (key: string) => store.get(key) ?? null
  );
  (localStorage.setItem as ReturnType<typeof vi.fn>).mockImplementation(
    (key: string, value: string) => store.set(key, value)
  );
  (localStorage.removeItem as ReturnType<typeof vi.fn>).mockImplementation((key: string) =>
    store.delete(key)
  );
  (localStorage.clear as ReturnType<typeof vi.fn>).mockImplementation(() => store.clear());
}

describe('useSavedViews', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams = new URLSearchParams();
    setupLocalStorage();
  });

  it('initial state returns empty array when localStorage is empty', () => {
    const { result } = renderHook(() => useSavedViews());
    expect(result.current.views).toEqual([]);
  });

  it('initial state reads existing views from localStorage', () => {
    const existing: SavedView[] = [
      {
        id: 'v1',
        name: 'My View',
        filters: {
          lifecycle: ['implementation'],
          status: ['running'],
          agentType: [],
          repository: [],
        },
        createdAt: new Date().toISOString(),
      },
    ];
    store.set(STORAGE_KEY, JSON.stringify(existing));

    const { result } = renderHook(() => useSavedViews());
    expect(result.current.views).toHaveLength(1);
    expect(result.current.views[0].name).toBe('My View');
  });

  it('saveView persists to localStorage and appears in views list', () => {
    const { result } = renderHook(() => useSavedViews());

    act(() => {
      result.current.saveView('Active Features', {
        lifecycle: new Set(['implementation']),
        status: new Set(['running']),
        agentType: new Set(),
        repository: new Set(),
      });
    });

    expect(result.current.views).toHaveLength(1);
    expect(result.current.views[0].name).toBe('Active Features');
    expect(result.current.views[0].filters.lifecycle).toEqual(['implementation']);
    expect(result.current.views[0].filters.status).toEqual(['running']);

    // Verify localStorage was called
    const stored = JSON.parse(store.get(STORAGE_KEY)!);
    expect(stored).toHaveLength(1);
  });

  it('deleteView removes from localStorage', () => {
    const { result } = renderHook(() => useSavedViews());

    act(() => {
      result.current.saveView('View 1', {
        lifecycle: new Set(),
        status: new Set(['running']),
        agentType: new Set(),
        repository: new Set(),
      });
    });

    act(() => {
      result.current.saveView('View 2', {
        lifecycle: new Set(),
        status: new Set(['done']),
        agentType: new Set(),
        repository: new Set(),
      });
    });

    expect(result.current.views).toHaveLength(2);

    const viewId = result.current.views[0].id;
    act(() => {
      result.current.deleteView(viewId);
    });

    expect(result.current.views).toHaveLength(1);
    expect(result.current.views[0].name).toBe('View 2');
  });

  it('renameView updates the name', () => {
    const { result } = renderHook(() => useSavedViews());

    act(() => {
      result.current.saveView('Old Name', {
        lifecycle: new Set(),
        status: new Set(),
        agentType: new Set(),
        repository: new Set(),
      });
    });

    const viewId = result.current.views[0].id;

    act(() => {
      result.current.renameView(viewId, 'New Name');
    });

    expect(result.current.views[0].name).toBe('New Name');

    // Verify localStorage
    const stored = JSON.parse(store.get(STORAGE_KEY)!);
    expect(stored[0].name).toBe('New Name');
  });

  it('applyView calls applyFilters with saved values', () => {
    const applyFilters = vi.fn();
    const { result } = renderHook(() => useSavedViews({ applyFilters }));

    act(() => {
      result.current.saveView('Saved', {
        lifecycle: new Set(['requirements']),
        status: new Set(['action-required']),
        agentType: new Set(['claude-code']),
        repository: new Set(['/home/user/repo']),
      });
    });

    const viewId = result.current.views[0].id;

    act(() => {
      result.current.applyView(viewId);
    });

    expect(applyFilters).toHaveBeenCalledWith({
      lifecycle: new Set(['requirements']),
      status: new Set(['action-required']),
      agentType: new Set(['claude-code']),
      repository: new Set(['/home/user/repo']),
    });
  });

  it('corrupted JSON in localStorage returns empty array without throwing', () => {
    store.set(STORAGE_KEY, '{invalid json!!!');

    const { result } = renderHook(() => useSavedViews());
    expect(result.current.views).toEqual([]);
  });

  it('non-array data in localStorage returns empty array', () => {
    store.set(STORAGE_KEY, '"just a string"');

    const { result } = renderHook(() => useSavedViews());
    expect(result.current.views).toEqual([]);
  });

  it('saveView generates unique IDs', () => {
    const { result } = renderHook(() => useSavedViews());
    const emptyFilters = {
      lifecycle: new Set<string>(),
      status: new Set<string>(),
      agentType: new Set<string>(),
      repository: new Set<string>(),
    };

    act(() => {
      result.current.saveView('View 1', emptyFilters);
    });
    act(() => {
      result.current.saveView('View 2', emptyFilters);
    });

    expect(result.current.views[0].id).not.toBe(result.current.views[1].id);
  });

  it('saveView stores creation timestamp', () => {
    const before = new Date().toISOString();
    const { result } = renderHook(() => useSavedViews());

    act(() => {
      result.current.saveView('Timestamped', {
        lifecycle: new Set(),
        status: new Set(),
        agentType: new Set(),
        repository: new Set(),
      });
    });

    const after = new Date().toISOString();
    expect(result.current.views[0].createdAt >= before).toBe(true);
    expect(result.current.views[0].createdAt <= after).toBe(true);
  });
});
