'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import type { NotificationEvent } from '@shepai/core/domain/generated/output';
import { NotificationSeverity } from '@shepai/core/domain/generated/output';
import { useAgentEventsContext } from './agent-events-provider';
import { useSound } from './use-sound';

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
  new Notification(`Shep: ${event.featureName}`, {
    body: event.message,
    icon: '/favicon-light.svg',
  });
}

const SEVERITY_TO_SOUND = {
  [NotificationSeverity.Success]: 'celebration',
  [NotificationSeverity.Error]: 'caution',
  [NotificationSeverity.Warning]: 'notification',
  [NotificationSeverity.Info]: 'button',
} as const;

export function useNotifications(): UseNotificationsResult {
  const { lastEvent } = useAgentEventsContext();

  const successSound = useSound('celebration', { volume: 0.5 });
  const errorSound = useSound('caution', { volume: 0.5 });
  const warningSound = useSound('notification', { volume: 0.5 });
  const infoSound = useSound('button', { volume: 0.5 });

  const soundsByName = useMemo<Record<string, { play: () => void }>>(
    () => ({
      celebration: successSound,
      caution: errorSound,
      notification: warningSound,
      button: infoSound,
    }),
    [successSound, errorSound, warningSound, infoSound]
  );

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

    // Only notify for actionable events and completion celebrations
    if (
      lastEvent.severity !== NotificationSeverity.Error &&
      lastEvent.severity !== NotificationSeverity.Warning &&
      lastEvent.severity !== NotificationSeverity.Success
    ) {
      return;
    }

    dispatchToast(lastEvent);
    dispatchBrowserNotification(lastEvent);

    const soundName = SEVERITY_TO_SOUND[lastEvent.severity];
    soundsByName[soundName]?.play();
  }, [lastEvent, soundsByName]);

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
