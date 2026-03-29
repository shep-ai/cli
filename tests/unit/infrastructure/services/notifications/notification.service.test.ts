/**
 * NotificationService Unit Tests
 *
 * Tests for the notification service that fans out events to
 * enabled channels (notification bus for SSE/in-app/browser,
 * desktop notifier for OS notifications), respecting Settings
 * preferences.
 */

import 'reflect-metadata';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { NotificationEvent, NotificationPreferences } from '@/domain/generated/output.js';
import { NotificationEventType, NotificationSeverity } from '@/domain/generated/output.js';
import {
  getNotificationBus,
  resetNotificationBus,
} from '@/infrastructure/services/notifications/notification-bus.js';
import { initializeSettings, resetSettings } from '@/infrastructure/services/settings.service.js';
import { createDefaultSettings } from '@/domain/factories/settings-defaults.factory.js';
import { NotificationService } from '@/infrastructure/services/notifications/notification.service.js';
import type { DesktopNotifier } from '@/infrastructure/services/notifications/desktop-notifier.js';
import type { ITelegramService } from '@/application/ports/output/services/telegram-service.interface.js';

function createTestEvent(overrides?: Partial<NotificationEvent>): NotificationEvent {
  return {
    eventType: NotificationEventType.AgentCompleted,
    agentRunId: 'run-123',
    featureId: 'feat-456',
    featureName: 'Test Feature',
    message: 'Agent completed successfully',
    severity: NotificationSeverity.Success,
    timestamp: new Date().toISOString(),
    ...overrides,
  };
}

function createMockDesktopNotifier(): DesktopNotifier {
  return {
    send: vi.fn(),
  } as unknown as DesktopNotifier;
}

function createMockTelegramService(): ITelegramService {
  return {
    validateBotToken: vi.fn().mockResolvedValue(undefined),
    resolveChatId: vi.fn().mockResolvedValue(undefined),
    sendMessage: vi.fn().mockResolvedValue(undefined),
    sendNotification: vi.fn().mockResolvedValue(undefined),
  } as unknown as ITelegramService;
}

function initSettingsWithNotifications(overrides: Partial<NotificationPreferences> = {}): void {
  const settings = createDefaultSettings();
  settings.notifications = {
    ...settings.notifications,
    ...overrides,
  };
  initializeSettings(settings);
}

describe('NotificationService', () => {
  let desktopNotifier: DesktopNotifier;
  let telegramService: ITelegramService;
  let service: NotificationService;
  let busEvents: NotificationEvent[];

  beforeEach(() => {
    resetNotificationBus();
    resetSettings();

    busEvents = [];
    const bus = getNotificationBus();
    bus.on('notification', (event) => busEvents.push(event));

    desktopNotifier = createMockDesktopNotifier();
    telegramService = createMockTelegramService();
  });

  describe('notify', () => {
    it('should emit to bus when inApp channel is enabled', () => {
      initSettingsWithNotifications({ inApp: { enabled: true } });
      service = new NotificationService(getNotificationBus(), desktopNotifier, telegramService);

      const event = createTestEvent();
      service.notify(event);

      expect(busEvents).toHaveLength(1);
      expect(busEvents[0]).toEqual(event);
    });

    it('should emit to bus when browser channel is enabled', () => {
      initSettingsWithNotifications({ browser: { enabled: true } });
      service = new NotificationService(getNotificationBus(), desktopNotifier, telegramService);

      const event = createTestEvent();
      service.notify(event);

      expect(busEvents).toHaveLength(1);
      expect(busEvents[0]).toEqual(event);
    });

    it('should never call DesktopNotifier.send() (desktop notifications removed)', () => {
      initSettingsWithNotifications({ desktop: { enabled: true } });
      service = new NotificationService(getNotificationBus(), desktopNotifier, telegramService);

      service.notify(createTestEvent());

      expect(desktopNotifier.send).not.toHaveBeenCalled();
    });

    it('should skip bus emission when both inApp and browser are disabled', () => {
      initSettingsWithNotifications({
        inApp: { enabled: false },
        browser: { enabled: false },
      });
      service = new NotificationService(getNotificationBus(), desktopNotifier, telegramService);

      service.notify(createTestEvent());

      expect(busEvents).toHaveLength(0);
    });

    it('should skip event when event type filter is false', () => {
      initSettingsWithNotifications({
        inApp: { enabled: true },
        desktop: { enabled: true },
        events: {
          agentStarted: true,
          phaseCompleted: true,
          waitingApproval: true,
          agentCompleted: false, // disabled
          agentFailed: true,
          prMerged: true,
          prClosed: true,
          prChecksPassed: true,
          prChecksFailed: true,
          prBlocked: true,
          mergeReviewReady: true,
        },
      });
      service = new NotificationService(getNotificationBus(), desktopNotifier, telegramService);

      service.notify(createTestEvent({ eventType: NotificationEventType.AgentCompleted }));

      expect(busEvents).toHaveLength(0);
      expect(desktopNotifier.send).not.toHaveBeenCalled();
    });

    it('should dispatch when event type filter is true', () => {
      initSettingsWithNotifications({
        inApp: { enabled: true },
        desktop: { enabled: true },
        events: {
          agentStarted: true,
          phaseCompleted: true,
          waitingApproval: true,
          agentCompleted: true,
          agentFailed: true,
          prMerged: true,
          prClosed: true,
          prChecksPassed: true,
          prChecksFailed: true,
          prBlocked: true,
          mergeReviewReady: true,
        },
      });
      service = new NotificationService(getNotificationBus(), desktopNotifier, telegramService);

      service.notify(
        createTestEvent({
          eventType: NotificationEventType.AgentFailed,
          severity: NotificationSeverity.Error,
        })
      );

      expect(busEvents).toHaveLength(1);
      expect(desktopNotifier.send).not.toHaveBeenCalled();
    });

    it('should emit to bus but not desktop when all channels are enabled', () => {
      initSettingsWithNotifications({
        inApp: { enabled: true },
        browser: { enabled: true },
        desktop: { enabled: true },
      });
      service = new NotificationService(getNotificationBus(), desktopNotifier, telegramService);

      const event = createTestEvent();
      service.notify(event);

      expect(busEvents).toHaveLength(1);
      expect(desktopNotifier.send).not.toHaveBeenCalled();
    });

    it('should send to Telegram when telegram is enabled and event type allowed', () => {
      const settings = createDefaultSettings();
      settings.notifications.inApp = { enabled: true };
      settings.telegram = {
        enabled: true,
        botToken: '123:ABC',
        chatId: '456',
        notifyEvents: {
          agentStarted: false,
          phaseCompleted: false,
          waitingApproval: true,
          agentCompleted: true,
          agentFailed: true,
          prMerged: true,
          prClosed: false,
          prChecksPassed: false,
          prChecksFailed: true,
          prBlocked: true,
          mergeReviewReady: true,
        },
      };
      resetSettings();
      initializeSettings(settings);
      service = new NotificationService(getNotificationBus(), desktopNotifier, telegramService);

      service.notify(createTestEvent({ eventType: NotificationEventType.AgentCompleted }));

      expect(telegramService.sendNotification).toHaveBeenCalledWith(
        '123:ABC',
        '456',
        expect.objectContaining({ eventType: NotificationEventType.AgentCompleted })
      );
    });

    it('should not send to Telegram when event type is not allowed', () => {
      const settings = createDefaultSettings();
      settings.telegram = {
        enabled: true,
        botToken: '123:ABC',
        chatId: '456',
        notifyEvents: {
          agentStarted: false,
          phaseCompleted: false,
          waitingApproval: true,
          agentCompleted: false, // disabled
          agentFailed: true,
          prMerged: true,
          prClosed: false,
          prChecksPassed: false,
          prChecksFailed: true,
          prBlocked: true,
          mergeReviewReady: true,
        },
      };
      resetSettings();
      initializeSettings(settings);
      service = new NotificationService(getNotificationBus(), desktopNotifier, telegramService);

      service.notify(createTestEvent({ eventType: NotificationEventType.AgentCompleted }));

      expect(telegramService.sendNotification).not.toHaveBeenCalled();
    });

    it('should not send to Telegram when telegram is disabled', () => {
      const settings = createDefaultSettings();
      settings.telegram = {
        enabled: false,
        botToken: '123:ABC',
        chatId: '456',
        notifyEvents: {
          agentStarted: false,
          phaseCompleted: false,
          waitingApproval: true,
          agentCompleted: true,
          agentFailed: true,
          prMerged: true,
          prClosed: false,
          prChecksPassed: false,
          prChecksFailed: true,
          prBlocked: true,
          mergeReviewReady: true,
        },
      };
      resetSettings();
      initializeSettings(settings);
      service = new NotificationService(getNotificationBus(), desktopNotifier, telegramService);

      service.notify(createTestEvent({ eventType: NotificationEventType.AgentCompleted }));

      expect(telegramService.sendNotification).not.toHaveBeenCalled();
    });
  });
});
