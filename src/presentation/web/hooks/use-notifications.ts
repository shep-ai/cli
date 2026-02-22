'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import type { NotificationEvent } from '@shepai/core/domain/generated/output';
import { NotificationSeverity } from '@shepai/core/domain/generated/output';
import { useAgentEventsContext } from './agent-events-provider';

export interface UseNotificationsResult {
  requestBrowserPermission: () => Promise<void>;
  browserPermissionState: NotificationPermission;
}

const SEVERITY_TO_TOAST: Record<NotificationSeverity, 'success' | 'error' | 'warning' | 'info'> = {
  [NotificationSeverity.Success]: 'success',
  [NotificationSeverity.Error]: 'error',
  [NotificationSeverity.Warning]: 'warning',
  [NotificationSeverity.Info]: 'info',
};

function dispatchToast(event: NotificationEvent): void {
  const method = SEVERITY_TO_TOAST[event.severity] ?? 'info';
  toast[method](event.featureName, { description: event.message });
}

function dispatchBrowserNotification(event: NotificationEvent): void {
  if (globalThis.Notification?.permission !== 'granted') {
    return;
  }
  new Notification(event.featureName, { body: event.message });
}

export function useNotifications(): UseNotificationsResult {
  const { lastEvent } = useAgentEventsContext();

  const [browserPermissionState, setBrowserPermissionState] = useState<NotificationPermission>(
    () => {
      if (typeof globalThis.Notification === 'undefined') return 'default';
      return globalThis.Notification.permission;
    }
  );

  // Track which events we've already dispatched to avoid re-dispatching on re-render
  const processedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!lastEvent) return;

    // Create a key for deduplication
    const key = `${lastEvent.agentRunId}-${lastEvent.eventType}-${lastEvent.timestamp}`;
    if (processedRef.current.has(key)) return;
    processedRef.current.add(key);

    dispatchToast(lastEvent);
    dispatchBrowserNotification(lastEvent);
  }, [lastEvent]);

  const requestBrowserPermission = useCallback(async () => {
    if (typeof globalThis.Notification === 'undefined') return;
    const result = await globalThis.Notification.requestPermission();
    setBrowserPermissionState(result);
  }, []);

  return {
    requestBrowserPermission,
    browserPermissionState,
  };
}
