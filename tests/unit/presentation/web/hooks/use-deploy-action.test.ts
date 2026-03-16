import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { DeploymentState } from '@shepai/core/domain/generated/output';
import { useDeployAction } from '@/hooks/use-deploy-action';

// --- Server action mocks ---
const mockDeployFeature = vi.fn();
const mockDeployRepository = vi.fn();
const mockStopDeployment = vi.fn();
const mockGetDeploymentStatus = vi.fn();
const mockAnalyzeRepository = vi.fn();
const mockInvalidateDevEnvCache = vi.fn();

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

vi.mock('@/app/actions/analyze-repository', () => ({
  analyzeRepository: (...args: unknown[]) => mockAnalyzeRepository(...args),
}));

vi.mock('@/app/actions/invalidate-dev-env-cache', () => ({
  invalidateDevEnvCache: (...args: unknown[]) => mockInvalidateDevEnvCache(...args),
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

const MOCK_ANALYSIS = {
  id: 'analysis-123',
  cacheKey: 'https://github.com/org/repo.git',
  canStart: true,
  commands: [{ command: 'npm run dev', description: 'Start dev server' }],
  language: 'TypeScript',
  framework: 'Next.js',
  source: 'Agent',
  ports: [3000],
  createdAt: new Date(),
  updatedAt: new Date(),
};

const NOT_STARTABLE_ANALYSIS = {
  ...MOCK_ANALYSIS,
  canStart: false,
  reason: 'Pure utility library with no server component',
  commands: [],
};

describe('useDeployAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    // Default: analyze returns failure so no cached analysis on mount
    mockAnalyzeRepository.mockResolvedValue({ success: false, error: 'No cache' });
    mockInvalidateDevEnvCache.mockResolvedValue({ success: true });
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

    it('sets NotStartable status when deploy returns NotStartable state', async () => {
      mockDeployFeature.mockResolvedValue({ success: true, state: DeploymentState.NotStartable });

      const { result } = renderHook(() => useDeployAction(featureInput));

      await act(async () => {
        await result.current.deploy();
      });

      expect(result.current.status).toBe(DeploymentState.NotStartable);
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
      mockGetDeploymentStatus.mockResolvedValue({
        state: DeploymentState.Ready,
        url: 'http://localhost:3000',
      });

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
      mockGetDeploymentStatus.mockResolvedValue({
        state: DeploymentState.Booting,
        url: null,
      });

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
      mockGetDeploymentStatus.mockResolvedValue({
        state: DeploymentState.Ready,
        url: 'http://localhost:3000',
      });

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
      mockGetDeploymentStatus.mockResolvedValue(null);

      const { result } = renderHook(() => useDeployAction(featureInput));

      await act(async () => {
        await result.current.deploy();
      });

      // First poll
      await act(async () => {
        vi.advanceTimersByTime(3000);
      });

      expect(result.current.status).toBeNull();
      expect(mockGetDeploymentStatus).toHaveBeenCalledTimes(1);

      // Second poll should not happen since status is null
      await act(async () => {
        vi.advanceTimersByTime(3000);
      });

      expect(mockGetDeploymentStatus).toHaveBeenCalledTimes(1);
    });

    it('stops polling when status returns Stopped', async () => {
      mockDeployFeature.mockResolvedValue({ success: true, state: DeploymentState.Booting });
      mockGetDeploymentStatus.mockResolvedValue({
        state: DeploymentState.Stopped,
        url: null,
      });

      const { result } = renderHook(() => useDeployAction(featureInput));

      await act(async () => {
        await result.current.deploy();
      });

      // First poll
      await act(async () => {
        vi.advanceTimersByTime(3000);
      });

      expect(result.current.status).toBeNull();
      expect(mockGetDeploymentStatus).toHaveBeenCalledTimes(1);

      // Second poll should not happen
      await act(async () => {
        vi.advanceTimersByTime(3000);
      });

      expect(mockGetDeploymentStatus).toHaveBeenCalledTimes(1);
    });

    it('stops polling when status returns NotStartable', async () => {
      mockDeployFeature.mockResolvedValue({ success: true, state: DeploymentState.Booting });
      mockGetDeploymentStatus.mockResolvedValue({
        state: DeploymentState.NotStartable,
        url: null,
      });

      const { result } = renderHook(() => useDeployAction(featureInput));

      await act(async () => {
        await result.current.deploy();
      });

      // First poll
      await act(async () => {
        vi.advanceTimersByTime(3000);
      });

      expect(result.current.status).toBe(DeploymentState.NotStartable);
      expect(mockGetDeploymentStatus).toHaveBeenCalledTimes(1);

      // Second poll should not happen
      await act(async () => {
        vi.advanceTimersByTime(3000);
      });

      expect(mockGetDeploymentStatus).toHaveBeenCalledTimes(1);
    });

    it('does not start polling when deploy fails', async () => {
      mockDeployFeature.mockResolvedValue({ success: false, error: 'No dev script' });

      const { result } = renderHook(() => useDeployAction(featureInput));

      await act(async () => {
        await result.current.deploy();
      });

      // Advance past poll interval
      await act(async () => {
        vi.advanceTimersByTime(3000);
      });

      expect(mockGetDeploymentStatus).not.toHaveBeenCalled();
      expect(result.current.status).toBeNull();
    });
  });

  describe('mode selection', () => {
    it('exposes mode state defaulting to null', () => {
      const { result } = renderHook(() => useDeployAction(featureInput));
      expect(result.current.mode).toBeNull();
    });

    it('allows setting mode via setMode', () => {
      const { result } = renderHook(() => useDeployAction(featureInput));

      act(() => {
        result.current.setMode('fast');
      });

      expect(result.current.mode).toBe('fast');

      act(() => {
        result.current.setMode('agent');
      });

      expect(result.current.mode).toBe('agent');
    });

    it('runs analysis with specified mode when deploying', async () => {
      mockAnalyzeRepository.mockResolvedValue({ success: true, analysis: MOCK_ANALYSIS });
      mockDeployFeature.mockResolvedValue({ success: true, state: DeploymentState.Booting });

      const { result } = renderHook(() => useDeployAction(featureInput));

      // Wait for mount analysis to complete
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });

      act(() => {
        result.current.setMode('agent');
      });

      // Clear the initial call from mount
      mockAnalyzeRepository.mockClear();
      mockAnalyzeRepository.mockResolvedValue({ success: true, analysis: MOCK_ANALYSIS });

      await act(async () => {
        await result.current.deploy();
      });

      expect(mockAnalyzeRepository).toHaveBeenCalledWith('/home/user/my-repo', 'agent');
    });
  });

  describe('analysis state', () => {
    it('loads cached analysis on mount', async () => {
      mockAnalyzeRepository.mockResolvedValue({ success: true, analysis: MOCK_ANALYSIS });

      const { result } = renderHook(() => useDeployAction(featureInput));

      // Wait for the async effect to complete
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });

      expect(result.current.analysisSummary).toEqual({
        canStart: true,
        reason: undefined,
        language: 'TypeScript',
        framework: 'Next.js',
        commandCount: 1,
        ports: [3000],
        source: 'Agent',
      });
    });

    it('sets NotStartable status on mount when analysis says not startable', async () => {
      mockAnalyzeRepository.mockResolvedValue({
        success: true,
        analysis: NOT_STARTABLE_ANALYSIS,
      });

      const { result } = renderHook(() => useDeployAction(featureInput));

      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });

      expect(result.current.status).toBe(DeploymentState.NotStartable);
      expect(result.current.analysisSummary?.canStart).toBe(false);
    });

    it('analysisSummary is null when no cache exists', async () => {
      mockAnalyzeRepository.mockResolvedValue({ success: false, error: 'No cache' });

      const { result } = renderHook(() => useDeployAction(featureInput));

      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });

      expect(result.current.analysisSummary).toBeNull();
    });
  });

  describe('reAnalyze', () => {
    it('invalidates cache and re-runs analysis', async () => {
      mockAnalyzeRepository.mockResolvedValue({ success: true, analysis: MOCK_ANALYSIS });
      mockInvalidateDevEnvCache.mockResolvedValue({ success: true });

      const { result } = renderHook(() => useDeployAction(featureInput));

      // Wait for mount — this sets mode to 'agent' from MOCK_ANALYSIS source
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });

      // Clear mocks from mount
      mockAnalyzeRepository.mockClear();
      mockAnalyzeRepository.mockResolvedValue({ success: true, analysis: MOCK_ANALYSIS });

      await act(async () => {
        await result.current.reAnalyze();
      });

      expect(mockInvalidateDevEnvCache).toHaveBeenCalledWith('/home/user/my-repo');
      // Mode was auto-set to 'agent' from the mounted analysis source
      expect(mockAnalyzeRepository).toHaveBeenCalledWith('/home/user/my-repo', 'agent');
    });

    it('sets analyzing to true during re-analysis', async () => {
      let resolveAnalyze!: (value: unknown) => void;
      mockAnalyzeRepository
        .mockResolvedValueOnce({ success: false, error: 'No cache' }) // mount
        .mockReturnValueOnce(
          new Promise((resolve) => {
            resolveAnalyze = resolve;
          })
        );

      const { result } = renderHook(() => useDeployAction(featureInput));

      // Wait for mount
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });

      expect(result.current.analyzing).toBe(false);

      let reAnalyzePromise: Promise<void>;
      act(() => {
        reAnalyzePromise = result.current.reAnalyze();
      });

      // After invalidateDevEnvCache resolves, analyzing should be true
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });

      expect(result.current.analyzing).toBe(true);

      await act(async () => {
        resolveAnalyze({ success: true, analysis: MOCK_ANALYSIS });
        await reAnalyzePromise;
      });

      expect(result.current.analyzing).toBe(false);
    });

    it('updates analysisSummary after successful re-analysis', async () => {
      mockAnalyzeRepository.mockResolvedValue({ success: false, error: 'No cache' });

      const { result } = renderHook(() => useDeployAction(featureInput));

      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });

      expect(result.current.analysisSummary).toBeNull();

      mockAnalyzeRepository.mockResolvedValue({ success: true, analysis: MOCK_ANALYSIS });

      await act(async () => {
        await result.current.reAnalyze();
      });

      expect(result.current.analysisSummary?.language).toBe('TypeScript');
      expect(result.current.analysisSummary?.commandCount).toBe(1);
    });
  });

  describe('cleanup', () => {
    it('cleans up timers and intervals on unmount', async () => {
      mockDeployFeature.mockResolvedValue({ success: true, state: DeploymentState.Booting });
      mockGetDeploymentStatus.mockResolvedValue({
        state: DeploymentState.Booting,
        url: null,
      });

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
});
