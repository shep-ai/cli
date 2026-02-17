/**
 * Notification Service Interface
 *
 * Output port for dispatching agent lifecycle notification events
 * to enabled channels (in-app, browser, desktop).
 * Infrastructure layer provides concrete implementation.
 *
 * Following Clean Architecture:
 * - Application layer depends on this interface
 * - Infrastructure layer provides concrete implementation (NotificationService)
 */

import type { NotificationEvent } from '../../../../domain/generated/output.js';

/**
 * Port interface for dispatching notification events.
 *
 * Implementations must:
 * - Fan out events to all enabled notification channels
 * - Respect per-channel enabled/disabled settings from Settings.notifications
 * - Handle channel-specific errors gracefully (log, don't crash)
 */
export interface INotificationService {
  /**
   * Dispatch a notification event to all enabled channels.
   *
   * @param event - The notification event to dispatch
   */
  notify(event: NotificationEvent): void;
}
