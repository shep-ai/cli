import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { DeploymentState } from '@shepai/core/domain/generated/output';
import { useDeployAction } from '@/hooks/use-deploy-action';

// --- Server action mocks ---
const mockDeployFeature = vi.fn();
const mockDeployRepository = vi.fn();
const mockStopDeployment = vi.fn();
const mockGetDeploymentStatus = vi.fn();

vi.mock('@/app/actions/deploy-feature', () => ({
  deployFeature: (...args: unknown[]) => mockDeployFeature(...args),
}));

vi.mock('@/app/actions/deploy-repository', () => ({
  deployRepository: (...args: unknown[]) => mockDeployRepository(...args),
}));

vi.mock('@/app/actions/stop-deployment', () => ({
  stopDeployment: (...args: unknown[]) => mockStopDeployment(...args),
}));

vi.mock('@/app/actions/get-deployment-status', () => ({
  getDeploymentStatus: (...args: unknown[]) => mockGetDeploymentStatus(...args),
}));

const featureInput = {
  targetId: 'feature-123',
  targetType: 'feature' as const,
  repositoryPath: '/home/user/my-repo',
  branch: 'feat/my-feature',
};

const repoInput = {
  targetId: '/home/user/my-repo',
  targetType: 'repository' as const,
  repositoryPath: '/home/user/my-repo',
};

describe('useDeployAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    // Default: no running deployment on mount, so the initial status fetch is a no-op
    mockGetDeploymentStatus.mockResolvedValue(null);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('deploy()', () => {
    it('calls deployFeature for feature targetType', async () => {
      mockDeployFeature.mockResolvedValue({ success: true, state: DeploymentState.Booting });

      const { result } = renderHook(() => useDeployAction(featureInput));

      await act(async () => {
        await result.current.deploy();
      });

      expect(mockDeployFeature).toHaveBeenCalledWith('feature-123');
      expect(mockDeployRepository).not.toHaveBeenCalled();
    });

    it('calls deployRepository for repository targetType', async () => {
      mockDeployRepository.mockResolvedValue({ success: true, state: DeploymentState.Booting });

      const { result } = renderHook(() => useDeployAction(repoInput));

      await act(async () => {
        await result.current.deploy();
      });

      expect(mockDeployRepository).toHaveBeenCalledWith('/home/user/my-repo');
      expect(mockDeployFeature).not.toHaveBeenCalled();
    });

    it('sets deployLoading to true during action and false after', async () => {
      let resolvePromise!: (value: { success: boolean; state: DeploymentState }) => void;
      mockDeployFeature.mockReturnValue(
        new Promise((resolve) => {
          resolvePromise = resolve;
        })
      );

      const { result } = renderHook(() => useDeployAction(featureInput));

      expect(result.current.deployLoading).toBe(false);

      let actionPromise: Promise<void>;
      act(() => {
        actionPromise = result.current.deploy();
      });

      expect(result.current.deployLoading).toBe(true);

      await act(async () => {
        resolvePromise({ success: true, state: DeploymentState.Booting });
        await actionPromise!;
      });

      expect(result.current.deployLoading).toBe(false);
    });

    it('sets deployError when server action returns error', async () => {
      mockDeployFeature.mockResolvedValue({ success: false, error: 'No dev script found' });

      const { result } = renderHook(() => useDeployAction(featureInput));

      await act(async () => {
        await result.current.deploy();
      });

      expect(result.current.deployError).toBe('No dev script found');
    });

    it('auto-clears deployError after 5 seconds', async () => {
      mockDeployFeature.mockResolvedValue({ success: false, error: 'No dev script found' });

      const { result } = renderHook(() => useDeployAction(featureInput));

      await act(async () => {
        await result.current.deploy();
      });

      expect(result.current.deployError).toBe('No dev script found');

      act(() => {
        vi.advanceTimersByTime(5000);
      });

      expect(result.current.deployError).toBeNull();
    });

    it('catches thrown errors and sets deployError', async () => {
      mockDeployFeature.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useDeployAction(featureInput));

      await act(async () => {
        await result.current.deploy();
      });

      expect(result.current.deployError).toBe('Network error');
      expect(result.current.deployLoading).toBe(false);
    });

    it('is no-op when input is null', async () => {
      const { result } = renderHook(() => useDeployAction(null));

      await act(async () => {
        await result.current.deploy();
      });

      expect(mockDeployFeature).not.toHaveBeenCalled();
      expect(mockDeployRepository).not.toHaveBeenCalled();
      expect(result.current.deployLoading).toBe(false);
    });

    it('is no-op while deployLoading is true', async () => {
      let resolvePromise!: (value: { success: boolean; state: DeploymentState }) => void;
      mockDeployFeature.mockReturnValue(
        new Promise((resolve) => {
          resolvePromise = resolve;
        })
      );

      const { result } = renderHook(() => useDeployAction(featureInput));

      act(() => {
        result.current.deploy();
      });

      expect(result.current.deployLoading).toBe(true);
      expect(mockDeployFeature).toHaveBeenCalledTimes(1);

      // Second call should be no-op
      await act(async () => {
        await result.current.deploy();
      });

      expect(mockDeployFeature).toHaveBeenCalledTimes(1);

      // Cleanup
      await act(async () => {
        resolvePromise({ success: true, state: DeploymentState.Booting });
      });
    });
  });

  describe('stop()', () => {
    it('calls stopDeployment with correct targetId', async () => {
      mockStopDeployment.mockResolvedValue({ success: true });

      const { result } = renderHook(() => useDeployAction(featureInput));

      await act(async () => {
        await result.current.stop();
      });

      expect(mockStopDeployment).toHaveBeenCalledWith('feature-123');
    });

    it('sets stopLoading to true during action and false after', async () => {
      let resolvePromise!: (value: { success: boolean }) => void;
      mockStopDeployment.mockReturnValue(
        new Promise((resolve) => {
          resolvePromise = resolve;
        })
      );

      const { result } = renderHook(() => useDeployAction(featureInput));

      expect(result.current.stopLoading).toBe(false);

      let actionPromise: Promise<void>;
      act(() => {
        actionPromise = result.current.stop();
      });

      expect(result.current.stopLoading).toBe(true);

      await act(async () => {
        resolvePromise({ success: true });
        await actionPromise!;
      });

      expect(result.current.stopLoading).toBe(false);
    });

    it('clears status and url on successful stop', async () => {
      // First deploy to get status
      mockDeployFeature.mockResolvedValue({ success: true, state: DeploymentState.Booting });
      // Initial fetch returns null (no pre-existing deployment), then poll returns Ready
      mockGetDeploymentStatus
        .mockResolvedValueOnce(null)
        .mockResolvedValue({ state: DeploymentState.Ready, url: 'http://localhost:3000' });

      const { result } = renderHook(() => useDeployAction(featureInput));

      await act(async () => {
        await result.current.deploy();
      });

      // Advance to pick up polling result
      await act(async () => {
        vi.advanceTimersByTime(3000);
      });

      expect(result.current.status).toBe(DeploymentState.Ready);
      expect(result.current.url).toBe('http://localhost:3000');

      // Now stop
      mockStopDeployment.mockResolvedValue({ success: true });

      await act(async () => {
        await result.current.stop();
      });

      expect(result.current.status).toBeNull();
      expect(result.current.url).toBeNull();
    });

    it('is no-op when input is null', async () => {
      const { result } = renderHook(() => useDeployAction(null));

      await act(async () => {
        await result.current.stop();
      });

      expect(mockStopDeployment).not.toHaveBeenCalled();
    });
  });

  describe('polling', () => {
    it('starts polling after successful deploy', async () => {
      mockDeployFeature.mockResolvedValue({ success: true, state: DeploymentState.Booting });
      // Initial fetch returns null (no pre-existing deployment), then poll returns Booting
      mockGetDeploymentStatus
        .mockResolvedValueOnce(null)
        .mockResolvedValue({ state: DeploymentState.Booting, url: null });

      const { result } = renderHook(() => useDeployAction(featureInput));

      await act(async () => {
        await result.current.deploy();
      });

      expect(result.current.status).toBe(DeploymentState.Booting);

      // Advance one poll interval (3s)
      await act(async () => {
        vi.advanceTimersByTime(3000);
      });

      expect(mockGetDeploymentStatus).toHaveBeenCalledWith('feature-123');
    });

    it('updates status and url from polling result', async () => {
      mockDeployFeature.mockResolvedValue({ success: true, state: DeploymentState.Booting });
      // Initial fetch returns null, then poll returns Ready
      mockGetDeploymentStatus
        .mockResolvedValueOnce(null)
        .mockResolvedValue({ state: DeploymentState.Ready, url: 'http://localhost:3000' });

      const { result } = renderHook(() => useDeployAction(featureInput));

      await act(async () => {
        await result.current.deploy();
      });

      // Advance one poll interval
      await act(async () => {
        vi.advanceTimersByTime(3000);
      });

      expect(result.current.status).toBe(DeploymentState.Ready);
      expect(result.current.url).toBe('http://localhost:3000');
    });

    it('stops polling when status returns null', async () => {
      mockDeployFeature.mockResolvedValue({ success: true, state: DeploymentState.Booting });
      // Default mock already returns null (from beforeEach)

      const { result } = renderHook(() => useDeployAction(featureInput));

      await act(async () => {
        await result.current.deploy();
      });

      // 1 call from initial fetch (returns null — no-op)
      const callsBeforePoll = mockGetDeploymentStatus.mock.calls.length;

      // First poll
      await act(async () => {
        vi.advanceTimersByTime(3000);
      });

      expect(result.current.status).toBeNull();
      expect(mockGetDeploymentStatus).toHaveBeenCalledTimes(callsBeforePoll + 1);

      // Second poll should not happen since status is null
      await act(async () => {
        vi.advanceTimersByTime(3000);
      });

      expect(mockGetDeploymentStatus).toHaveBeenCalledTimes(callsBeforePoll + 1);
    });

    it('stops polling when status returns Stopped', async () => {
      mockDeployFeature.mockResolvedValue({ success: true, state: DeploymentState.Booting });
      // Initial fetch returns null, then poll returns Stopped
      mockGetDeploymentStatus
        .mockResolvedValueOnce(null)
        .mockResolvedValue({ state: DeploymentState.Stopped, url: null });

      const { result } = renderHook(() => useDeployAction(featureInput));

      await act(async () => {
        await result.current.deploy();
      });

      const callsBeforePoll = mockGetDeploymentStatus.mock.calls.length;

      // First poll
      await act(async () => {
        vi.advanceTimersByTime(3000);
      });

      expect(result.current.status).toBeNull();
      expect(mockGetDeploymentStatus).toHaveBeenCalledTimes(callsBeforePoll + 1);

      // Second poll should not happen
      await act(async () => {
        vi.advanceTimersByTime(3000);
      });

      expect(mockGetDeploymentStatus).toHaveBeenCalledTimes(callsBeforePoll + 1);
    });

    it('does not start polling when deploy fails', async () => {
      mockDeployFeature.mockResolvedValue({ success: false, error: 'No dev script' });
      // Default mock returns null (initial fetch is no-op)

      const { result } = renderHook(() => useDeployAction(featureInput));

      await act(async () => {
        await result.current.deploy();
      });

      const callsAfterDeploy = mockGetDeploymentStatus.mock.calls.length;

      // Advance past poll interval — no new calls should happen
      await act(async () => {
        vi.advanceTimersByTime(3000);
      });

      expect(mockGetDeploymentStatus).toHaveBeenCalledTimes(callsAfterDeploy);
      expect(result.current.status).toBeNull();
    });
  });

  describe('cleanup', () => {
    it('cleans up timers and intervals on unmount', async () => {
      mockDeployFeature.mockResolvedValue({ success: true, state: DeploymentState.Booting });
      // Initial fetch returns null, then poll returns Booting
      mockGetDeploymentStatus
        .mockResolvedValueOnce(null)
        .mockResolvedValue({ state: DeploymentState.Booting, url: null });

      const { result, unmount } = renderHook(() => useDeployAction(featureInput));

      await act(async () => {
        await result.current.deploy();
      });

      unmount();

      // Advancing timers after unmount should not throw or call getDeploymentStatus
      const callsBeforeUnmount = mockGetDeploymentStatus.mock.calls.length;

      await act(async () => {
        vi.advanceTimersByTime(6000);
      });

      expect(mockGetDeploymentStatus).toHaveBeenCalledTimes(callsBeforeUnmount);
    });

    it('cleans up error timer on unmount', async () => {
      mockDeployFeature.mockResolvedValue({ success: false, error: 'Failed' });

      const { result, unmount } = renderHook(() => useDeployAction(featureInput));

      await act(async () => {
        await result.current.deploy();
      });

      expect(result.current.deployError).toBe('Failed');

      unmount();

      // Advancing timers after unmount should not throw
      act(() => {
        vi.advanceTimersByTime(5000);
      });
    });
  });

  describe('initial status fetch', () => {
    it('fetches deployment status on mount when input is provided', async () => {
      mockGetDeploymentStatus.mockResolvedValue({
        state: DeploymentState.Ready,
        url: 'http://localhost:3000',
      });

      const { result } = renderHook(() => useDeployAction(featureInput));

      // Allow the initial fetch promise to resolve
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });

      expect(mockGetDeploymentStatus).toHaveBeenCalledWith('feature-123');
      expect(result.current.status).toBe(DeploymentState.Ready);
      expect(result.current.url).toBe('http://localhost:3000');
    });

    it('starts polling after discovering a running deployment on mount', async () => {
      mockGetDeploymentStatus.mockResolvedValue({
        state: DeploymentState.Booting,
        url: null,
      });

      renderHook(() => useDeployAction(featureInput));

      // Allow initial fetch to resolve
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });

      // Initial fetch call
      expect(mockGetDeploymentStatus).toHaveBeenCalledTimes(1);

      // Now update the mock for the poll result
      mockGetDeploymentStatus.mockResolvedValue({
        state: DeploymentState.Ready,
        url: 'http://localhost:3000',
      });

      // Advance one poll interval to verify polling started
      await act(async () => {
        await vi.advanceTimersByTimeAsync(3000);
      });

      // Initial fetch + 1 poll = 2 calls
      expect(mockGetDeploymentStatus).toHaveBeenCalledTimes(2);
    });

    it('does not set status when deployment is stopped', async () => {
      mockGetDeploymentStatus.mockResolvedValue({
        state: DeploymentState.Stopped,
        url: null,
      });

      const { result } = renderHook(() => useDeployAction(featureInput));

      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });

      expect(result.current.status).toBeNull();
      expect(result.current.url).toBeNull();
    });

    it('does not set status when deployment result is null', async () => {
      mockGetDeploymentStatus.mockResolvedValue(null);

      const { result } = renderHook(() => useDeployAction(featureInput));

      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });

      expect(result.current.status).toBeNull();
    });

    it('does not fetch when input is null', async () => {
      renderHook(() => useDeployAction(null));

      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });

      expect(mockGetDeploymentStatus).not.toHaveBeenCalled();
    });

    it('cancels initial fetch when unmounted before resolution', async () => {
      let resolveStatus!: (value: { state: DeploymentState; url: string | null }) => void;
      mockGetDeploymentStatus.mockReturnValue(
        new Promise((resolve) => {
          resolveStatus = resolve;
        })
      );

      const { result, unmount } = renderHook(() => useDeployAction(featureInput));

      unmount();

      // Resolve after unmount — should not update state
      await act(async () => {
        resolveStatus({ state: DeploymentState.Ready, url: 'http://localhost:3000' });
      });

      expect(result.current.status).toBeNull();
    });
  });
});
