/**
 * Notification Event Bus
 *
 * Typed EventEmitter singleton for in-process pub/sub of notification events.
 * Follows the getSettings() singleton pattern from settings.service.ts.
 *
 * Multiple listeners can subscribe to the 'notification' event for fan-out
 * delivery (SSE clients, desktop notifier, etc.).
 *
 * Usage:
 * ```typescript
 * import { getNotificationBus } from './notification-bus.js';
 *
 * const bus = getNotificationBus();
 * bus.on('notification', (event) => { ... });
 * bus.emit('notification', event);
 * ```
 */

import { EventEmitter } from 'node:events';
import type { NotificationEvent } from '../../../domain/generated/output.js';

export interface NotificationEventMap {
  notification: [event: NotificationEvent];
}

export type NotificationBus = EventEmitter<NotificationEventMap>;

let busInstance: NotificationBus | null = null;

/**
 * Initialize the notification event bus singleton.
 * Must be called once during CLI bootstrap.
 *
 * @throws Error if the bus is already initialized
 */
export function initializeNotificationBus(): void {
  if (busInstance !== null) {
    throw new Error('Notification bus already initialized. Cannot re-initialize.');
  }

  busInstance = new EventEmitter<NotificationEventMap>();
}

/**
 * Get the notification event bus singleton.
 *
 * @returns The notification event bus
 * @throws Error if the bus hasn't been initialized yet
 */
export function getNotificationBus(): NotificationBus {
  if (busInstance === null) {
    throw new Error(
      'Notification bus not initialized. Call initializeNotificationBus() during CLI bootstrap.'
    );
  }

  return busInstance;
}

/**
 * Check if the notification bus has been initialized.
 *
 * @returns True if the bus is initialized, false otherwise
 */
export function hasNotificationBus(): boolean {
  return busInstance !== null;
}

/**
 * Reset the notification bus singleton (for testing purposes only).
 * DO NOT use in production code.
 *
 * @internal
 */
export function resetNotificationBus(): void {
  if (busInstance !== null) {
    busInstance.removeAllListeners();
  }
  busInstance = null;
}
