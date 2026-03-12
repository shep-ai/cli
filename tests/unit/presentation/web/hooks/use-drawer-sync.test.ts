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

  it('does not fetch when drawer is already open on mount', async () => {
    mockGetFeatureDrawerData.mockResolvedValue({ featureId: 'feat-123' });

    const setView = vi.fn();

    // Drawer already open on first render — no "transition" from closed→open
    renderHook(() => useDrawerSync(true, 'feat-123', setView));

    // The wasOpenRef starts as `isOpen` (true), so no open transition detected
    expect(mockGetFeatureDrawerData).not.toHaveBeenCalled();
  });

  it('runs background sync every 15 seconds while drawer is open', async () => {
    mockGetFeatureDrawerData.mockResolvedValue({
      featureId: 'feat-123',
      name: 'Updated',
      state: 'running',
      lifecycle: 'requirements',
    });

    const setView = vi.fn();

    renderHook(() => useDrawerSync(true, 'feat-123', setView));

    expect(mockGetFeatureDrawerData).not.toHaveBeenCalled();

    // Advance 15 seconds — first background sync
    await act(async () => {
      vi.advanceTimersByTime(15_000);
    });

    expect(mockGetFeatureDrawerData).toHaveBeenCalledTimes(1);

    // Advance another 15 seconds — second background sync
    await act(async () => {
      vi.advanceTimersByTime(15_000);
    });

    expect(mockGetFeatureDrawerData).toHaveBeenCalledTimes(2);
  });

  it('stops background sync when drawer closes', async () => {
    mockGetFeatureDrawerData.mockResolvedValue({
      featureId: 'feat-123',
      name: 'Updated',
      state: 'running',
      lifecycle: 'requirements',
    });

    const setView = vi.fn();

    const { rerender } = renderHook(({ isOpen }) => useDrawerSync(isOpen, 'feat-123', setView), {
      initialProps: { isOpen: true },
    });

    // Close the drawer
    rerender({ isOpen: false });

    // Advance past interval — should NOT fetch
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

  it('merges fresh data into existing feature view', async () => {
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

    // Simulate React calling the updater function with prev state
    const prevView = makeFeatureView();
    const newView = capturedUpdater!(prevView);

    expect(newView.type).toBe('feature');
    if (newView.type === 'feature') {
      expect(newView.node.name).toBe('Updated Name');
      expect(newView.node.state).toBe('action-required');
      // initialTab should be re-derived
      expect(newView.initialTab).toBe('prd-review');
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

    const { unmount } = renderHook(() => useDrawerSync(true, 'feat-123', setView));

    unmount();

    await act(async () => {
      vi.advanceTimersByTime(30_000);
    });

    expect(mockGetFeatureDrawerData).not.toHaveBeenCalled();
  });
});
