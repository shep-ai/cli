/**
 * Notification Bus Unit Tests
 *
 * Tests for the typed EventEmitter singleton that provides
 * in-process pub/sub for notification events with fan-out
 * to multiple listeners.
 */

import 'reflect-metadata';
import { describe, it, expect, beforeEach } from 'vitest';
import {
  getNotificationBus,
  resetNotificationBus,
} from '@/infrastructure/services/notifications/notification-bus.js';
import { NotificationEventType, NotificationSeverity } from '@/domain/generated/output.js';
import type { NotificationEvent } from '@/domain/generated/output.js';

function createTestEvent(overrides?: Partial<NotificationEvent>): NotificationEvent {
  return {
    eventType: NotificationEventType.AgentCompleted,
    agentRunId: 'run-123',
    featureName: 'Test Feature',
    message: 'Agent completed successfully',
    severity: NotificationSeverity.Success,
    timestamp: new Date().toISOString(),
    ...overrides,
  };
}

describe('NotificationBus', () => {
  beforeEach(() => {
    resetNotificationBus();
  });

  describe('getNotificationBus', () => {
    it('should lazily create the singleton on first access', () => {
      const bus = getNotificationBus();
      expect(bus).toBeDefined();
      expect(typeof bus.on).toBe('function');
      expect(typeof bus.emit).toBe('function');
    });

    it('should return the same instance on subsequent calls', () => {
      const bus1 = getNotificationBus();
      const bus2 = getNotificationBus();
      expect(bus1).toBe(bus2);
    });
  });

  describe('event emission', () => {
    it('should deliver notification event to listener', () => {
      const bus = getNotificationBus();
      const received: NotificationEvent[] = [];

      bus.on('notification', (event) => {
        received.push(event);
      });

      const testEvent = createTestEvent();
      bus.emit('notification', testEvent);

      expect(received).toHaveLength(1);
      expect(received[0]).toEqual(testEvent);
    });

    it('should fan out to multiple listeners', () => {
      const bus = getNotificationBus();
      const listener1: NotificationEvent[] = [];
      const listener2: NotificationEvent[] = [];
      const listener3: NotificationEvent[] = [];

      bus.on('notification', (event) => listener1.push(event));
      bus.on('notification', (event) => listener2.push(event));
      bus.on('notification', (event) => listener3.push(event));

      const testEvent = createTestEvent();
      bus.emit('notification', testEvent);

      expect(listener1).toHaveLength(1);
      expect(listener2).toHaveLength(1);
      expect(listener3).toHaveLength(1);
      expect(listener1[0]).toEqual(testEvent);
      expect(listener2[0]).toEqual(testEvent);
      expect(listener3[0]).toEqual(testEvent);
    });

    it('should support listener removal', () => {
      const bus = getNotificationBus();
      const received: NotificationEvent[] = [];

      const listener = (event: NotificationEvent) => {
        received.push(event);
      };

      bus.on('notification', listener);
      bus.emit('notification', createTestEvent());
      expect(received).toHaveLength(1);

      bus.removeListener('notification', listener);
      bus.emit('notification', createTestEvent());
      expect(received).toHaveLength(1);
    });
  });

  describe('resetNotificationBus', () => {
    it('should clear the singleton so a new one is created on next access', () => {
      const bus1 = getNotificationBus();
      resetNotificationBus();
      const bus2 = getNotificationBus();
      expect(bus1).not.toBe(bus2);
    });
  });
});
