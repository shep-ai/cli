/**
 * Telegram Service Interface
 *
 * Output port for interacting with the Telegram Bot API.
 * Infrastructure layer provides concrete implementation.
 *
 * Following Clean Architecture:
 * - Application layer depends on this interface
 * - Infrastructure layer provides concrete implementation (TelegramService)
 */

import type { NotificationEvent } from '../../../../domain/generated/output.js';

/**
 * Result of validating a bot token against the Telegram API.
 */
export interface TelegramBotInfo {
  /** Bot's unique ID */
  id: number;
  /** Bot's display name */
  firstName: string;
  /** Bot's @username */
  username: string;
}

/**
 * Result of resolving the chat ID from recent bot updates.
 */
export interface TelegramChatResolution {
  /** Resolved chat ID from the first /start message */
  chatId: string;
  /** Display name of the user who started the chat */
  firstName: string;
}

/**
 * Port interface for Telegram Bot API interactions.
 *
 * Implementations must:
 * - Use the Telegram Bot HTTP API (no SDK dependency required)
 * - Handle network errors gracefully (log, don't crash the host process)
 * - Respect the enabled/disabled toggle in TelegramConfig
 */
export interface ITelegramService {
  /**
   * Validate a bot token by calling getMe on the Telegram Bot API.
   *
   * @param botToken - The bot token to validate
   * @returns Bot info if valid
   * @throws TelegramAuthError if the token is invalid
   */
  validateBotToken(botToken: string): Promise<TelegramBotInfo>;

  /**
   * Resolve the chat ID by polling getUpdates for a /start message.
   *
   * @param botToken - The bot token to use
   * @returns Chat resolution with the chat ID and sender name
   * @throws TelegramNoChatError if no /start message is found
   */
  resolveChatId(botToken: string): Promise<TelegramChatResolution>;

  /**
   * Send a plain text message to the configured Telegram chat.
   *
   * @param botToken - The bot token to use
   * @param chatId - The chat ID to send to
   * @param text - The message text (supports Telegram MarkdownV2)
   */
  sendMessage(botToken: string, chatId: string, text: string): Promise<void>;

  /**
   * Format and send a notification event to Telegram.
   *
   * @param botToken - The bot token to use
   * @param chatId - The chat ID to send to
   * @param event - The notification event to format and send
   */
  sendNotification(botToken: string, chatId: string, event: NotificationEvent): Promise<void>;
}

/**
 * Error thrown when a Telegram bot token is invalid or expired.
 */
export class TelegramAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TelegramAuthError';
  }
}

/**
 * Error thrown when no /start message is found in recent bot updates.
 */
export class TelegramNoChatError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TelegramNoChatError';
  }
}

/**
 * Error thrown when sending a Telegram message fails.
 */
export class TelegramSendError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TelegramSendError';
  }
}
