/**
 * Notification Event Bus
 *
 * Typed EventEmitter singleton for in-process pub/sub of notification events.
 * Lazily initialized on first access — works in any context (CLI, web dev server, tests).
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
 * Get the notification event bus singleton.
 * Lazily creates the bus on first access.
 */
export function getNotificationBus(): NotificationBus {
  busInstance ??= new EventEmitter<NotificationEventMap>();
  return busInstance;
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
