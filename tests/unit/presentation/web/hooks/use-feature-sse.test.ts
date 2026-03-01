import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { NotificationEventType } from '@shepai/core/domain/generated';
import type { NotificationEvent } from '@shepai/core/domain/generated/output';

// --- Mocks ---

let mockEvents: NotificationEvent[] = [];
vi.mock('@/hooks/agent-events-provider', () => ({
  useAgentEventsContext: () => ({
    events: mockEvents,
    lastEvent: mockEvents.length > 0 ? mockEvents[mockEvents.length - 1] : null,
    connectionStatus: 'connected' as const,
  }),
}));

const mockRefresh = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}));

const mockToastSuccess = vi.fn();
const mockToastWarning = vi.fn();
const mockToastError = vi.fn();
vi.mock('sonner', () => ({
  toast: Object.assign(vi.fn(), {
    success: (...args: unknown[]) => mockToastSuccess(...args),
    warning: (...args: unknown[]) => mockToastWarning(...args),
    error: (...args: unknown[]) => mockToastError(...args),
  }),
}));

import { useFeatureSSE } from '@/hooks/use-feature-sse';
import type { FeatureNodeData } from '@/components/common/feature-node';

function createEvent(
  featureId: string,
  eventType: NotificationEventType,
  phaseName?: string
): NotificationEvent {
  return {
    eventType,
    agentRunId: 'run-1',
    featureId,
    featureName: `Feature ${featureId}`,
    phaseName,
    message: `Event: ${eventType}`,
    severity: 'info' as never,
    timestamp: new Date().toISOString(),
  };
}

function createFeatureNodeData(
  featureId: string,
  state: FeatureNodeData['state'] = 'running',
  lifecycle: FeatureNodeData['lifecycle'] = 'implementation'
): FeatureNodeData {
  return {
    name: `Feature ${featureId}`,
    featureId,
    lifecycle,
    state,
    progress: 50,
    repositoryPath: '/home/user/repo',
    branch: 'feat/test',
  };
}

describe('useFeatureSSE', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    mockEvents = [];
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not call updateFeature when no events are present', () => {
    const updateFeature = vi.fn();
    const updateSelection = vi.fn();

    renderHook(() => useFeatureSSE({ updateFeature, updateSelection }));

    expect(updateFeature).not.toHaveBeenCalled();
  });

  it('calls updateFeature with derived state and lifecycle for new events', () => {
    const updateFeature = vi.fn();
    const updateSelection = vi.fn();

    const { rerender } = renderHook(() => useFeatureSSE({ updateFeature, updateSelection }));

    // Add an event
    mockEvents = [createEvent('#f1', NotificationEventType.AgentStarted, 'implement')];
    rerender();

    expect(updateFeature).toHaveBeenCalledWith('#f1', 'running', 'implementation');
  });

  it('calls updateSelection for matching feature', () => {
    const updateFeature = vi.fn();
    const updateSelection = vi.fn();

    const { rerender } = renderHook(() => useFeatureSSE({ updateFeature, updateSelection }));

    mockEvents = [createEvent('#f1', NotificationEventType.WaitingApproval)];
    rerender();

    expect(updateSelection).toHaveBeenCalledWith('#f1', 'action-required', undefined);
  });

  it('skips already-processed events by count', () => {
    const updateFeature = vi.fn();
    const updateSelection = vi.fn();

    const event1 = createEvent('#f1', NotificationEventType.AgentStarted);
    mockEvents = [event1];

    const { rerender } = renderHook(() => useFeatureSSE({ updateFeature, updateSelection }));

    // First render processes the event
    expect(updateFeature).toHaveBeenCalledTimes(1);

    // Same events array length — should not re-process
    rerender();
    expect(updateFeature).toHaveBeenCalledTimes(1);

    // Add a second event — only the new one should be processed
    mockEvents = [event1, createEvent('#f2', NotificationEventType.AgentCompleted)];
    rerender();

    expect(updateFeature).toHaveBeenCalledTimes(2);
    expect(updateFeature).toHaveBeenLastCalledWith('#f2', 'done', undefined);
  });

  it('fires debounced router.refresh after 3s of no new events', () => {
    const updateFeature = vi.fn();
    const updateSelection = vi.fn();

    const { rerender } = renderHook(() => useFeatureSSE({ updateFeature, updateSelection }));

    mockEvents = [createEvent('#f1', NotificationEventType.AgentStarted)];
    rerender();

    expect(mockRefresh).not.toHaveBeenCalled();

    // Advance 3 seconds
    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(mockRefresh).toHaveBeenCalledTimes(1);
  });

  it('resets debounce timer when new events arrive', () => {
    const updateFeature = vi.fn();
    const updateSelection = vi.fn();

    const { rerender } = renderHook(() => useFeatureSSE({ updateFeature, updateSelection }));

    mockEvents = [createEvent('#f1', NotificationEventType.AgentStarted)];
    rerender();

    // Advance 2 seconds (not yet 3s)
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(mockRefresh).not.toHaveBeenCalled();

    // New event arrives — resets timer
    mockEvents = [...mockEvents, createEvent('#f2', NotificationEventType.AgentStarted)];
    rerender();

    // Advance another 2 seconds (4s total, but only 2s since last event)
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(mockRefresh).not.toHaveBeenCalled();

    // Advance final 1 second (3s since last event)
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(mockRefresh).toHaveBeenCalledTimes(1);
  });

  describe('fallback notifications', () => {
    it('fires toast for done state transition not covered by SSE', () => {
      const updateFeature = vi.fn();
      const updateSelection = vi.fn();

      const initialFeatures = [createFeatureNodeData('#f1', 'running')];

      const { rerender } = renderHook(
        ({ features }) =>
          useFeatureSSE({
            updateFeature,
            updateSelection,
            initialFeatures: features,
          }),
        { initialProps: { features: initialFeatures } }
      );

      // Feature transitions to done on server (no SSE event)
      const updatedFeatures = [createFeatureNodeData('#f1', 'done')];
      rerender({ features: updatedFeatures });

      expect(mockToastSuccess).toHaveBeenCalledWith('Feature #f1', {
        description: 'Feature completed!',
      });
    });

    it('fires warning toast for action-required transition not covered by SSE', () => {
      const updateFeature = vi.fn();
      const updateSelection = vi.fn();

      const initialFeatures = [createFeatureNodeData('#f1', 'running')];

      const { rerender } = renderHook(
        ({ features }) =>
          useFeatureSSE({
            updateFeature,
            updateSelection,
            initialFeatures: features,
          }),
        { initialProps: { features: initialFeatures } }
      );

      const updatedFeatures = [createFeatureNodeData('#f1', 'action-required')];
      rerender({ features: updatedFeatures });

      expect(mockToastWarning).toHaveBeenCalledWith(
        'Feature #f1',
        expect.objectContaining({
          description: 'Waiting for your approval',
        })
      );
    });

    it('fires error toast for error transition not covered by SSE', () => {
      const updateFeature = vi.fn();
      const updateSelection = vi.fn();

      const initialFeatures = [
        { ...createFeatureNodeData('#f1', 'running'), errorMessage: 'Agent crashed' },
      ];

      const { rerender } = renderHook(
        ({ features }) =>
          useFeatureSSE({
            updateFeature,
            updateSelection,
            initialFeatures: features,
          }),
        { initialProps: { features: initialFeatures } }
      );

      const updatedFeatures = [
        { ...createFeatureNodeData('#f1', 'error'), errorMessage: 'Agent crashed' },
      ];
      rerender({ features: updatedFeatures });

      expect(mockToastError).toHaveBeenCalledWith('Feature #f1', {
        description: 'Agent crashed',
      });
    });

    it('does NOT fire toast when SSE already covered the transition', () => {
      const updateFeature = vi.fn();
      const updateSelection = vi.fn();

      // SSE event already present for this feature transition
      mockEvents = [createEvent('#f1', NotificationEventType.AgentCompleted)];

      const initialFeatures = [createFeatureNodeData('#f1', 'running')];

      const { rerender } = renderHook(
        ({ features }) =>
          useFeatureSSE({
            updateFeature,
            updateSelection,
            initialFeatures: features,
          }),
        { initialProps: { features: initialFeatures } }
      );

      const updatedFeatures = [createFeatureNodeData('#f1', 'done')];
      rerender({ features: updatedFeatures });

      expect(mockToastSuccess).not.toHaveBeenCalled();
    });
  });
});
