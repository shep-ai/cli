'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import type { NotificationEvent } from '@shepai/core/domain/generated/output';
import { NotificationEventType, NotificationSeverity } from '@shepai/core/domain/generated/output';
import { useAgentEventsContext } from './agent-events-provider';
import { useSoundAction } from './use-sound-action';
import type { SoundAction } from './use-sound-action';

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
  const isActionable = event.eventType === NotificationEventType.WaitingApproval;
  toast[method](event.featureName, {
    description: event.message,
    ...(isActionable && {
      action: {
        label: 'Review',
        onClick: () => {
          window.dispatchEvent(
            new CustomEvent('shep:select-feature', { detail: { featureId: event.featureId } })
          );
        },
      },
    }),
  });
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

const SEVERITY_TO_ACTION: Record<NotificationSeverity, SoundAction> = {
  [NotificationSeverity.Success]: 'notification-success',
  [NotificationSeverity.Error]: 'notification-error',
  [NotificationSeverity.Warning]: 'notification-warning',
  [NotificationSeverity.Info]: 'notification-info',
};

export function useNotifications(): UseNotificationsResult {
  const { events } = useAgentEventsContext();

  const successSound = useSoundAction('notification-success');
  const errorSound = useSoundAction('notification-error');
  const warningSound = useSoundAction('notification-warning');
  const infoSound = useSoundAction('notification-info');

  const soundsByAction = useMemo<Record<string, { play: () => void }>>(
    () => ({
      'notification-success': successSound,
      'notification-error': errorSound,
      'notification-warning': warningSound,
      'notification-info': infoSound,
    }),
    [successSound, errorSound, warningSound, infoSound]
  );

  const [browserPermissionState, setBrowserPermissionState] = useState<NotificationPermission>(
    () => {
      if (typeof globalThis.Notification === 'undefined') return 'default';
      return globalThis.Notification.permission;
    }
  );

  // Track how many events from the array we've already processed.
  // Using the array index (instead of lastEvent) prevents React batching
  // from silently dropping events when multiple SSE messages arrive together.
  const processedCountRef = useRef(0);

  useEffect(() => {
    if (events.length <= processedCountRef.current) return;

    const newEvents = events.slice(processedCountRef.current);
    processedCountRef.current = events.length;

    for (const event of newEvents) {
      // Only notify for actionable events and completion celebrations
      if (
        event.severity !== NotificationSeverity.Error &&
        event.severity !== NotificationSeverity.Warning &&
        event.severity !== NotificationSeverity.Success
      ) {
        continue;
      }

      dispatchToast(event);
      dispatchBrowserNotification(event);

      const actionName = SEVERITY_TO_ACTION[event.severity];
      soundsByAction[actionName]?.play();
    }
  }, [events, soundsByAction]);

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
