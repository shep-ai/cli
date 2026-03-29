/**
 * Notification Service
 *
 * Implements INotificationService port interface. Fans out notification
 * events to enabled channels:
 * - Notification bus (for SSE → in-app toasts and browser notifications)
 * - Desktop notifier (node-notifier for OS-level notifications)
 * - Telegram bot (sends messages via Bot API)
 *
 * Channel enable/disable and event type filters are read from Settings.
 */

import type {
  NotificationEvent,
  NotificationEventConfig,
  TelegramNotifyEvents,
} from '../../../domain/generated/output.js';
import { NotificationEventType } from '../../../domain/generated/output.js';
import type { INotificationService } from '../../../application/ports/output/services/notification-service.interface.js';
import type { ITelegramService } from '../../../application/ports/output/services/telegram-service.interface.js';
import { getSettings } from '../settings.service.js';
import type { NotificationBus } from './notification-bus.js';
import type { DesktopNotifier } from './desktop-notifier.js';

const EVENT_TYPE_TO_CONFIG_KEY: Record<NotificationEventType, keyof NotificationEventConfig> = {
  [NotificationEventType.AgentStarted]: 'agentStarted',
  [NotificationEventType.PhaseCompleted]: 'phaseCompleted',
  [NotificationEventType.WaitingApproval]: 'waitingApproval',
  [NotificationEventType.AgentCompleted]: 'agentCompleted',
  [NotificationEventType.AgentFailed]: 'agentFailed',
  [NotificationEventType.PrMerged]: 'prMerged',
  [NotificationEventType.PrClosed]: 'prClosed',
  [NotificationEventType.PrChecksPassed]: 'prChecksPassed',
  [NotificationEventType.PrChecksFailed]: 'prChecksFailed',
  [NotificationEventType.PrBlocked]: 'prBlocked',
  [NotificationEventType.MergeReviewReady]: 'mergeReviewReady',
};

const EVENT_TYPE_TO_TELEGRAM_KEY: Record<NotificationEventType, keyof TelegramNotifyEvents> = {
  [NotificationEventType.AgentStarted]: 'agentStarted',
  [NotificationEventType.PhaseCompleted]: 'phaseCompleted',
  [NotificationEventType.WaitingApproval]: 'waitingApproval',
  [NotificationEventType.AgentCompleted]: 'agentCompleted',
  [NotificationEventType.AgentFailed]: 'agentFailed',
  [NotificationEventType.PrMerged]: 'prMerged',
  [NotificationEventType.PrClosed]: 'prClosed',
  [NotificationEventType.PrChecksPassed]: 'prChecksPassed',
  [NotificationEventType.PrChecksFailed]: 'prChecksFailed',
  [NotificationEventType.PrBlocked]: 'prBlocked',
  [NotificationEventType.MergeReviewReady]: 'mergeReviewReady',
};

export class NotificationService implements INotificationService {
  private readonly bus: NotificationBus;
  private readonly desktopNotifier: DesktopNotifier;
  private readonly telegramService: ITelegramService;

  constructor(
    bus: NotificationBus,
    desktopNotifier: DesktopNotifier,
    telegramService: ITelegramService
  ) {
    this.bus = bus;
    this.desktopNotifier = desktopNotifier;
    this.telegramService = telegramService;
  }

  notify(event: NotificationEvent): void {
    const { notifications } = getSettings();

    // Check event type filter
    const configKey = EVENT_TYPE_TO_CONFIG_KEY[event.eventType];
    if (configKey && !notifications.events[configKey]) {
      return;
    }

    // Emit to bus if in-app or browser channel is enabled
    if (notifications.inApp.enabled || notifications.browser.enabled) {
      this.bus.emit('notification', event);
    }

    // Desktop notifications disabled — removed in favour of in-app toasts.
    // The DesktopNotifier dependency is kept for API compatibility but never called.

    // Send to Telegram if enabled and event type is allowed
    this.sendTelegramNotification(event);
  }

  /**
   * Send a notification to Telegram if the channel is enabled and
   * the specific event type is allowed in the Telegram notify events config.
   */
  private sendTelegramNotification(event: NotificationEvent): void {
    const { telegram } = getSettings();
    if (!telegram?.enabled || !telegram.botToken || !telegram.chatId) {
      return;
    }

    // Check Telegram-specific event type filter
    const telegramKey = EVENT_TYPE_TO_TELEGRAM_KEY[event.eventType];
    if (telegramKey && !telegram.notifyEvents[telegramKey]) {
      return;
    }

    // Fire-and-forget: don't block the notification pipeline on Telegram API calls
    this.telegramService.sendNotification(telegram.botToken, telegram.chatId, event).catch(() => {
      // Swallow errors silently — Telegram is a best-effort channel.
      // Network failures, rate limits, or invalid tokens should not
      // break the core notification flow.
    });
  }
}
