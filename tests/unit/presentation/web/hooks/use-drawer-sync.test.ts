import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { SetStateAction } from 'react';
import type { DrawerView } from '@/components/common/control-center-drawer/drawer-view';

const mockGetFeatureDrawerData = vi.fn();

vi.mock('@/app/actions/get-feature-drawer-data', () => ({
  getFeatureDrawerData: (...args: unknown[]) => mockGetFeatureDrawerData(...args),
}));

// Must import after mocking
const { useDrawerSync } = await import(
  '../../../../../src/presentation/web/components/common/control-center-drawer/use-drawer-sync.js'
);

const makeFeatureView = (overrides?: Record<string, unknown>): DrawerView => ({
  type: 'feature',
  node: {
    featureId: 'feat-123',
    name: 'Test Feature',
    description: 'A test',
    state: 'running',
    lifecycle: 'requirements',
    progress: 0,
    repositoryPath: '/repo',
    branch: 'feat/test',
    ...overrides,
  },
  initialTab: 'overview',
});

describe('useDrawerSync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('fetches fresh data when drawer opens', async () => {
    const freshData = {
      featureId: 'feat-123',
      name: 'Updated Feature',
      state: 'action-required',
      lifecycle: 'requirements',
    };
    mockGetFeatureDrawerData.mockResolvedValue(freshData);

    const setView = vi.fn();

    // Start with drawer closed
    const { rerender } = renderHook(({ isOpen }) => useDrawerSync(isOpen, 'feat-123', setView), {
      initialProps: { isOpen: false },
    });

    expect(mockGetFeatureDrawerData).not.toHaveBeenCalled();

    // Open the drawer
    await act(async () => {
      rerender({ isOpen: true });
    });

    expect(mockGetFeatureDrawerData).toHaveBeenCalledWith('feat-123');
    expect(setView).toHaveBeenCalled();
  });

  it('fetches immediately when drawer is already open on mount', async () => {
    mockGetFeatureDrawerData.mockResolvedValue({ featureId: 'feat-123' });

    const setView = vi.fn();

    // Drawer already open on first render — should still fetch to hydrate
    // the minimal server-rendered data with full details
    await act(async () => {
      renderHook(() => useDrawerSync(true, 'feat-123', setView));
    });

    expect(mockGetFeatureDrawerData).toHaveBeenCalledWith('feat-123');
  });

  it('runs background sync every 15 seconds while drawer is open', async () => {
    mockGetFeatureDrawerData.mockResolvedValue({
      featureId: 'feat-123',
      name: 'Updated',
      state: 'running',
      lifecycle: 'requirements',
    });

    const setView = vi.fn();

    await act(async () => {
      renderHook(() => useDrawerSync(true, 'feat-123', setView));
    });

    // 1 call from initial mount fetch
    expect(mockGetFeatureDrawerData).toHaveBeenCalledTimes(1);

    // Advance 15 seconds — first background sync
    await act(async () => {
      vi.advanceTimersByTime(15_000);
    });

    expect(mockGetFeatureDrawerData).toHaveBeenCalledTimes(2);

    // Advance another 15 seconds — second background sync
    await act(async () => {
      vi.advanceTimersByTime(15_000);
    });

    expect(mockGetFeatureDrawerData).toHaveBeenCalledTimes(3);
  });

  it('stops background sync when drawer closes', async () => {
    mockGetFeatureDrawerData.mockResolvedValue({
      featureId: 'feat-123',
      name: 'Updated',
      state: 'running',
      lifecycle: 'requirements',
    });

    const setView = vi.fn();

    let rerender: (props: { isOpen: boolean }) => void;
    await act(async () => {
      const result = renderHook(({ isOpen }) => useDrawerSync(isOpen, 'feat-123', setView), {
        initialProps: { isOpen: true },
      });
      rerender = result.rerender;
    });

    // 1 call from initial mount
    expect(mockGetFeatureDrawerData).toHaveBeenCalledTimes(1);
    mockGetFeatureDrawerData.mockClear();

    // Close the drawer
    rerender!({ isOpen: false });

    // Advance past interval — should NOT fetch after close
    await act(async () => {
      vi.advanceTimersByTime(30_000);
    });

    expect(mockGetFeatureDrawerData).not.toHaveBeenCalled();
  });

  it('does not fetch when featureId is null', async () => {
    const setView = vi.fn();

    renderHook(() => useDrawerSync(true, null, setView));

    await act(async () => {
      vi.advanceTimersByTime(15_000);
    });

    expect(mockGetFeatureDrawerData).not.toHaveBeenCalled();
  });

  it('re-derives initialTab when state changes', async () => {
    const freshData = {
      featureId: 'feat-123',
      name: 'Updated Name',
      state: 'action-required',
      lifecycle: 'requirements',
      progress: 50,
    };
    mockGetFeatureDrawerData.mockResolvedValue(freshData);

    let capturedUpdater: ((prev: DrawerView) => DrawerView) | undefined;
    const setView: React.Dispatch<React.SetStateAction<DrawerView>> = vi.fn(
      (updater: SetStateAction<DrawerView>) => {
        if (typeof updater === 'function') capturedUpdater = updater;
      }
    );

    renderHook(() => useDrawerSync(true, 'feat-123', setView));

    await act(async () => {
      vi.advanceTimersByTime(15_000);
    });

    expect(setView).toHaveBeenCalled();

    // prev state is 'running', fresh is 'action-required' → tab should re-derive
    const prevView = makeFeatureView();
    const newView = capturedUpdater!(prevView);

    expect(newView.type).toBe('feature');
    if (newView.type === 'feature') {
      expect(newView.node.name).toBe('Updated Name');
      expect(newView.node.state).toBe('action-required');
      expect(newView.initialTab).toBe('prd-review');
    }
  });

  it('preserves initialTab when state and lifecycle are unchanged', async () => {
    // Fresh data has same state/lifecycle but different name
    const freshData = {
      featureId: 'feat-123',
      name: 'Updated Name',
      state: 'running',
      lifecycle: 'requirements',
      progress: 75,
    };
    mockGetFeatureDrawerData.mockResolvedValue(freshData);

    let capturedUpdater: ((prev: DrawerView) => DrawerView) | undefined;
    const setView: React.Dispatch<React.SetStateAction<DrawerView>> = vi.fn(
      (updater: SetStateAction<DrawerView>) => {
        if (typeof updater === 'function') capturedUpdater = updater;
      }
    );

    renderHook(() => useDrawerSync(true, 'feat-123', setView));

    await act(async () => {
      vi.advanceTimersByTime(15_000);
    });

    // prev state is 'running', fresh is also 'running' → tab should NOT re-derive
    const prevView = makeFeatureView();
    const newView = capturedUpdater!(prevView);

    expect(newView.type).toBe('feature');
    if (newView.type === 'feature') {
      expect(newView.node.name).toBe('Updated Name');
      expect(newView.node.progress).toBe(75);
      // initialTab preserved from prev, not re-derived
      expect(newView.initialTab).toBe('overview');
    }
  });

  it('preserves non-feature view types', async () => {
    const freshData = {
      featureId: 'feat-123',
      name: 'Updated',
      state: 'running',
    };
    mockGetFeatureDrawerData.mockResolvedValue(freshData);

    let capturedUpdater: ((prev: DrawerView) => DrawerView) | undefined;
    const setView: React.Dispatch<React.SetStateAction<DrawerView>> = vi.fn(
      (updater: SetStateAction<DrawerView>) => {
        if (typeof updater === 'function') capturedUpdater = updater;
      }
    );

    renderHook(() => useDrawerSync(true, 'feat-123', setView));

    await act(async () => {
      vi.advanceTimersByTime(15_000);
    });

    // If prev view is not a feature, it should pass through unchanged
    const repoView: DrawerView = {
      type: 'repository',
      data: { name: 'repo', repositoryPath: '/repo', id: 'repo-1', createdAt: 0 },
    };
    const result = capturedUpdater!(repoView);
    expect(result).toBe(repoView);
  });

  it('silently handles fetch errors', async () => {
    mockGetFeatureDrawerData.mockRejectedValue(new Error('Network error'));

    const setView = vi.fn();

    renderHook(() => useDrawerSync(true, 'feat-123', setView));

    // Should not throw
    await act(async () => {
      vi.advanceTimersByTime(15_000);
    });

    expect(setView).not.toHaveBeenCalled();
  });

  it('handles null response from server', async () => {
    mockGetFeatureDrawerData.mockResolvedValue(null);

    const setView = vi.fn();

    renderHook(() => useDrawerSync(true, 'feat-123', setView));

    await act(async () => {
      vi.advanceTimersByTime(15_000);
    });

    expect(setView).not.toHaveBeenCalled();
  });

  it('cleans up interval on unmount', async () => {
    mockGetFeatureDrawerData.mockResolvedValue({
      featureId: 'feat-123',
      state: 'running',
    });

    const setView = vi.fn();

    let unmount: () => void;
    await act(async () => {
      const result = renderHook(() => useDrawerSync(true, 'feat-123', setView));
      unmount = result.unmount;
    });

    // 1 call from initial mount
    expect(mockGetFeatureDrawerData).toHaveBeenCalledTimes(1);
    mockGetFeatureDrawerData.mockClear();

    unmount!();

    await act(async () => {
      vi.advanceTimersByTime(30_000);
    });

    // No further calls after unmount
    expect(mockGetFeatureDrawerData).not.toHaveBeenCalled();
  });
});
