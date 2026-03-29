/**
 * Telegram Service Unit Tests
 *
 * Tests for the TelegramService implementation that communicates
 * with the Telegram Bot HTTP API.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TelegramService } from '@/infrastructure/services/telegram/telegram.service.js';
import {
  TelegramAuthError,
  TelegramNoChatError,
  TelegramSendError,
} from '@/application/ports/output/services/telegram-service.interface.js';
import { NotificationEventType, NotificationSeverity } from '@/domain/generated/output.js';
import type { NotificationEvent } from '@/domain/generated/output.js';

describe('TelegramService', () => {
  let service: TelegramService;
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    service = new TelegramService();
    fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('validateBotToken', () => {
    it('should return bot info for a valid token', async () => {
      fetchSpy.mockResolvedValue({
        json: () =>
          Promise.resolve({
            ok: true,
            result: { id: 123, first_name: 'ShepBot', username: 'shep_test_bot' },
          }),
      });

      const result = await service.validateBotToken('123:ABC');

      expect(result).toEqual({
        id: 123,
        firstName: 'ShepBot',
        username: 'shep_test_bot',
      });
      expect(fetchSpy).toHaveBeenCalledWith('https://api.telegram.org/bot123:ABC/getMe');
    });

    it('should throw TelegramAuthError for an invalid token', async () => {
      fetchSpy.mockResolvedValue({
        json: () =>
          Promise.resolve({
            ok: false,
            description: 'Unauthorized',
          }),
      });

      await expect(service.validateBotToken('invalid')).rejects.toThrow(TelegramAuthError);
      await expect(service.validateBotToken('invalid')).rejects.toThrow('Unauthorized');
    });

    it('should throw TelegramAuthError on network failure', async () => {
      fetchSpy.mockRejectedValue(new Error('Network error'));

      await expect(service.validateBotToken('123:ABC')).rejects.toThrow(TelegramAuthError);
      await expect(service.validateBotToken('123:ABC')).rejects.toThrow('Network error');
    });
  });

  describe('resolveChatId', () => {
    it('should resolve chat ID from a /start message', async () => {
      fetchSpy.mockResolvedValue({
        json: () =>
          Promise.resolve({
            ok: true,
            result: [
              {
                message: {
                  text: '/start',
                  chat: { id: 456789 },
                  from: { first_name: 'Alice' },
                },
              },
            ],
          }),
      });

      const result = await service.resolveChatId('123:ABC');

      expect(result).toEqual({
        chatId: '456789',
        firstName: 'Alice',
      });
    });

    it('should throw TelegramNoChatError when no /start message exists', async () => {
      fetchSpy.mockResolvedValue({
        json: () =>
          Promise.resolve({
            ok: true,
            result: [
              {
                message: {
                  text: '/help',
                  chat: { id: 456789 },
                  from: { first_name: 'Alice' },
                },
              },
            ],
          }),
      });

      await expect(service.resolveChatId('123:ABC')).rejects.toThrow(TelegramNoChatError);
      await expect(service.resolveChatId('123:ABC')).rejects.toThrow('/start');
    });

    it('should throw TelegramNoChatError when result is empty', async () => {
      fetchSpy.mockResolvedValue({
        json: () => Promise.resolve({ ok: true, result: [] }),
      });

      await expect(service.resolveChatId('123:ABC')).rejects.toThrow(TelegramNoChatError);
    });
  });

  describe('sendMessage', () => {
    it('should send a message via the Bot API', async () => {
      fetchSpy.mockResolvedValue({
        json: () => Promise.resolve({ ok: true }),
      });

      await service.sendMessage('123:ABC', '456', 'Hello');

      expect(fetchSpy).toHaveBeenCalledWith('https://api.telegram.org/bot123:ABC/sendMessage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: '456',
          text: 'Hello',
          parse_mode: 'HTML',
        }),
      });
    });

    it('should throw TelegramSendError when API returns error', async () => {
      fetchSpy.mockResolvedValue({
        json: () =>
          Promise.resolve({
            ok: false,
            description: 'Chat not found',
          }),
      });

      await expect(service.sendMessage('123:ABC', '456', 'Hello')).rejects.toThrow(
        TelegramSendError
      );
    });

    it('should throw TelegramSendError on network failure', async () => {
      fetchSpy.mockRejectedValue(new Error('Connection refused'));

      await expect(service.sendMessage('123:ABC', '456', 'Hello')).rejects.toThrow(
        TelegramSendError
      );
    });
  });

  describe('sendNotification', () => {
    it('should format and send a notification event', async () => {
      fetchSpy.mockResolvedValue({
        json: () => Promise.resolve({ ok: true }),
      });

      const event: NotificationEvent = {
        eventType: NotificationEventType.AgentCompleted,
        agentRunId: 'run-1',
        featureId: 'feat-1',
        featureName: 'Add login page',
        message: 'Implementation completed successfully',
        severity: NotificationSeverity.Success,
        timestamp: new Date().toISOString(),
      };

      await service.sendNotification('123:ABC', '456', event);

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      const body = JSON.parse(fetchSpy.mock.calls[0][1].body);
      expect(body.chat_id).toBe('456');
      expect(body.text).toContain('Agent Completed');
      expect(body.text).toContain('Add login page');
      expect(body.text).toContain('Implementation completed successfully');
    });

    it('should escape HTML in feature names and messages', async () => {
      fetchSpy.mockResolvedValue({
        json: () => Promise.resolve({ ok: true }),
      });

      const event: NotificationEvent = {
        eventType: NotificationEventType.AgentFailed,
        agentRunId: 'run-1',
        featureId: 'feat-1',
        featureName: '<script>alert("xss")</script>',
        message: 'Error in <module>',
        severity: NotificationSeverity.Error,
        timestamp: new Date().toISOString(),
      };

      await service.sendNotification('123:ABC', '456', event);

      const body = JSON.parse(fetchSpy.mock.calls[0][1].body);
      expect(body.text).not.toContain('<script>');
      expect(body.text).toContain('&lt;script&gt;');
    });
  });
});
