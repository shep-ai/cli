'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useAgentEventsContext } from '@/hooks/agent-events-provider';
import type { FeatureNodeData, FeatureLifecyclePhase } from '@/components/common/feature-node';
import {
  mapEventTypeToState,
  mapPhaseNameToLifecycle,
} from '@/components/common/feature-node/derive-feature-state';

export interface UseFeatureSSEOptions {
  /** Callback to update a feature's state/lifecycle by featureId. */
  updateFeature: (
    featureId: string,
    newState: FeatureNodeData['state'],
    newLifecycle: FeatureLifecyclePhase | undefined
  ) => void;
  /** Callback to update the selected feature if it matches. */
  updateSelection: (
    featureId: string,
    newState: FeatureNodeData['state'],
    newLifecycle: FeatureLifecyclePhase | undefined
  ) => void;
  /**
   * Features for fallback notification detection.
   * When server-refreshed features show a state change not covered by SSE,
   * a toast notification fires.
   */
  initialFeatures?: FeatureNodeData[];
}

/**
 * Processes SSE agent events for targeted optimistic updates.
 *
 * - Calls updateFeature/updateSelection for each new SSE event
 * - Fires a debounced router.refresh() 3s after the last event batch
 * - Detects state transitions from server refreshes not covered by SSE
 *   and fires fallback toast notifications
 */
export function useFeatureSSE(options: UseFeatureSSEOptions): void {
  const router = useRouter();
  const { events } = useAgentEventsContext();

  const processedEventCountRef = useRef(0);
  const reconcileTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Refs for callbacks to avoid effect dependencies
  const updateFeatureRef = useRef(options.updateFeature);
  updateFeatureRef.current = options.updateFeature;
  const updateSelectionRef = useRef(options.updateSelection);
  updateSelectionRef.current = options.updateSelection;

  // Cleanup reconciliation timer on unmount
  useEffect(() => {
    return () => clearTimeout(reconcileTimerRef.current);
  }, []);

  // Process new SSE events
  useEffect(() => {
    if (events.length <= processedEventCountRef.current) return;

    const newEvents = events.slice(processedEventCountRef.current);
    processedEventCountRef.current = events.length;

    for (const event of newEvents) {
      const newState = mapEventTypeToState(event.eventType);
      const newLifecycle = mapPhaseNameToLifecycle(event.phaseName);

      updateFeatureRef.current(event.featureId, newState, newLifecycle);
      updateSelectionRef.current(event.featureId, newState, newLifecycle);
    }

    // Debounced background reconciliation (3s after last SSE event)
    clearTimeout(reconcileTimerRef.current);
    reconcileTimerRef.current = setTimeout(() => router.refresh(), 3000);
  }, [events, router]);

  // Fallback notifications for server-refresh state transitions
  const prevFeatureStatesRef = useRef<Map<string, FeatureNodeData['state']>>(new Map());

  // Stable data key that changes when feature state/lifecycle changes
  const initialFeatures = options.initialFeatures;
  const initialDataKey = initialFeatures
    ?.map((f) => `${f.featureId}:${f.state}:${f.lifecycle}`)
    .sort()
    .join(',');

  useEffect(() => {
    if (!initialFeatures) return;
    const prevStates = prevFeatureStatesRef.current;

    for (const data of initialFeatures) {
      const prev = prevStates.get(data.featureId);

      if (prev !== undefined && prev !== data.state) {
        // Check if SSE already delivered a matching event for this feature
        const sseAlreadyCovered = events.some(
          (e) => e.featureId === data.featureId && mapEventTypeToState(e.eventType) === data.state
        );

        if (!sseAlreadyCovered) {
          if (data.state === 'done') {
            toast.success(data.name, { description: 'Feature completed!' });
          } else if (data.state === 'action-required') {
            toast.warning(data.name, {
              description: 'Waiting for your approval',
              action: {
                label: 'Review',
                onClick: () => {
                  window.dispatchEvent(
                    new CustomEvent('shep:select-feature', {
                      detail: { featureId: data.featureId },
                    })
                  );
                },
              },
            });
          } else if (data.state === 'error') {
            toast.error(data.name, { description: data.errorMessage ?? 'Agent failed' });
          }
        }
      }

      prevStates.set(data.featureId, data.state);
    }
  }, [initialDataKey, initialFeatures, events]);
}
