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

/**
 * Symbol key for storing the bus on globalThis.
 * Using a symbol prevents accidental collisions and ensures the singleton
 * is shared across module boundaries (e.g., Next.js Turbopack-bundled code
 * vs. the dev-server process running via tsx).
 */
const GLOBAL_KEY = Symbol.for('shep:notification-bus');

/**
 * Get the notification event bus singleton.
 * Lazily creates the bus on first access.
 *
 * Uses globalThis to ensure a single instance across all module contexts
 * (critical for Next.js where bundled routes and the server process
 * may each get their own copy of module-level variables).
 */
export function getNotificationBus(): NotificationBus {
  const g = globalThis as Record<symbol, NotificationBus | undefined>;
  g[GLOBAL_KEY] ??= new EventEmitter<NotificationEventMap>();
  return g[GLOBAL_KEY];
}

/**
 * Reset the notification bus singleton (for testing purposes only).
 * DO NOT use in production code.
 *
 * @internal
 */
export function resetNotificationBus(): void {
  const g = globalThis as Record<symbol, NotificationBus | undefined>;
  const bus = g[GLOBAL_KEY];
  if (bus) {
    bus.removeAllListeners();
  }
  g[GLOBAL_KEY] = undefined;
}
