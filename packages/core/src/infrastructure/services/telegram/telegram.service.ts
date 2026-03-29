/**
 * Telegram Service Implementation
 *
 * Implements the ITelegramService port using the Telegram Bot HTTP API.
 * Uses native `fetch` (available in Node 18+) — no external SDK required.
 *
 * All methods are stateless; bot token and chat ID are passed as parameters
 * so the service can be used for validation before persisting config.
 */

import type { NotificationEvent } from '../../../domain/generated/output.js';
import { NotificationEventType } from '../../../domain/generated/output.js';
import type {
  ITelegramService,
  TelegramBotInfo,
  TelegramChatResolution,
} from '../../../application/ports/output/services/telegram-service.interface.js';
import {
  TelegramAuthError,
  TelegramNoChatError,
  TelegramSendError,
} from '../../../application/ports/output/services/telegram-service.interface.js';

const TELEGRAM_API_BASE = 'https://api.telegram.org/bot';

/**
 * Human-readable labels for notification event types.
 */
const EVENT_LABELS: Record<NotificationEventType, string> = {
  [NotificationEventType.AgentStarted]: 'Agent Started',
  [NotificationEventType.PhaseCompleted]: 'Phase Completed',
  [NotificationEventType.WaitingApproval]: 'Waiting for Approval',
  [NotificationEventType.AgentCompleted]: 'Agent Completed',
  [NotificationEventType.AgentFailed]: 'Agent Failed',
  [NotificationEventType.PrMerged]: 'PR Merged',
  [NotificationEventType.PrClosed]: 'PR Closed',
  [NotificationEventType.PrChecksPassed]: 'PR Checks Passed',
  [NotificationEventType.PrChecksFailed]: 'PR Checks Failed',
  [NotificationEventType.PrBlocked]: 'PR Blocked',
  [NotificationEventType.MergeReviewReady]: 'Merge Review Ready',
};

/**
 * Emoji indicators for notification event types.
 */
const EVENT_EMOJI: Record<NotificationEventType, string> = {
  [NotificationEventType.AgentStarted]: '\u{1F680}',
  [NotificationEventType.PhaseCompleted]: '\u2705',
  [NotificationEventType.WaitingApproval]: '\u23F3',
  [NotificationEventType.AgentCompleted]: '\u{1F389}',
  [NotificationEventType.AgentFailed]: '\u274C',
  [NotificationEventType.PrMerged]: '\u{1F7E2}',
  [NotificationEventType.PrClosed]: '\u{1F534}',
  [NotificationEventType.PrChecksPassed]: '\u2705',
  [NotificationEventType.PrChecksFailed]: '\u274C',
  [NotificationEventType.PrBlocked]: '\u26A0\uFE0F',
  [NotificationEventType.MergeReviewReady]: '\u{1F4CB}',
};

export class TelegramService implements ITelegramService {
  async validateBotToken(botToken: string): Promise<TelegramBotInfo> {
    const url = `${TELEGRAM_API_BASE}${botToken}/getMe`;

    let response: Response;
    try {
      response = await fetch(url);
    } catch (error) {
      throw new TelegramAuthError(
        `Failed to connect to Telegram API: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    const body = (await response.json()) as {
      ok: boolean;
      result?: { id: number; first_name: string; username: string };
      description?: string;
    };

    if (!body.ok || !body.result) {
      throw new TelegramAuthError(body.description ?? 'Invalid bot token');
    }

    return {
      id: body.result.id,
      firstName: body.result.first_name,
      username: body.result.username,
    };
  }

  async resolveChatId(botToken: string): Promise<TelegramChatResolution> {
    const url = `${TELEGRAM_API_BASE}${botToken}/getUpdates?limit=10&allowed_updates=["message"]`;

    let response: Response;
    try {
      response = await fetch(url);
    } catch (error) {
      throw new TelegramNoChatError(
        `Failed to connect to Telegram API: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    const body = (await response.json()) as {
      ok: boolean;
      result?: {
        message?: {
          text?: string;
          chat: { id: number };
          from?: { first_name: string };
        };
      }[];
    };

    if (!body.ok || !body.result) {
      throw new TelegramNoChatError('Failed to fetch bot updates');
    }

    // Look for a /start message
    const startUpdate = body.result.find((update) => update.message?.text === '/start');

    if (!startUpdate?.message) {
      throw new TelegramNoChatError(
        'No /start message found. Please send /start to your bot on Telegram first, then retry.'
      );
    }

    return {
      chatId: String(startUpdate.message.chat.id),
      firstName: startUpdate.message.from?.first_name ?? 'Unknown',
    };
  }

  async sendMessage(botToken: string, chatId: string, text: string): Promise<void> {
    const url = `${TELEGRAM_API_BASE}${botToken}/sendMessage`;

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: 'HTML',
        }),
      });
    } catch (error) {
      throw new TelegramSendError(
        `Failed to send Telegram message: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    const body = (await response.json()) as {
      ok: boolean;
      description?: string;
    };

    if (!body.ok) {
      throw new TelegramSendError(`Telegram API error: ${body.description ?? 'Unknown error'}`);
    }
  }

  async sendNotification(
    botToken: string,
    chatId: string,
    event: NotificationEvent
  ): Promise<void> {
    const emoji = EVENT_EMOJI[event.eventType] ?? '';
    const label = EVENT_LABELS[event.eventType] ?? event.eventType;

    const lines: string[] = [
      `${emoji} <b>${label}</b>`,
      `Feature: ${this.escapeHtml(event.featureName)}`,
    ];

    if (event.message) {
      lines.push(`\n${this.escapeHtml(event.message)}`);
    }

    await this.sendMessage(botToken, chatId, lines.join('\n'));
  }

  /**
   * Escape HTML special characters for Telegram's HTML parse mode.
   */
  private escapeHtml(text: string): string {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
}
