/**
 * Configure Telegram Use Case
 *
 * Validates the Telegram bot token, resolves the chat ID, and
 * persists the Telegram configuration to settings.
 *
 * Business Rules:
 * - Bot token must be valid (verified via Telegram API getMe)
 * - Chat ID is resolved automatically from recent /start messages
 * - If both token and chatId are provided, skip auto-resolution
 * - Disabling clears only the enabled flag (preserves token + chatId for re-enable)
 */

import { injectable, inject } from 'tsyringe';
import type {
  Settings,
  TelegramConfig,
  TelegramNotifyEvents,
} from '../../../domain/generated/output.js';
import type { ISettingsRepository } from '../../ports/output/repositories/settings.repository.interface.js';
import type {
  ITelegramService,
  TelegramBotInfo,
  TelegramChatResolution,
} from '../../ports/output/services/telegram-service.interface.js';

export interface ConfigureTelegramInput {
  /** Enable or disable Telegram integration */
  enabled: boolean;
  /** Bot API token from @BotFather (required when enabling) */
  botToken?: string;
  /** Chat ID to send notifications to (optional, auto-resolved if omitted) */
  chatId?: string;
  /** Notification event type filters (optional, uses defaults if omitted) */
  notifyEvents?: Partial<TelegramNotifyEvents>;
}

export interface ConfigureTelegramResult {
  /** Updated settings */
  settings: Settings;
  /** Bot info (only when enabling with a new token) */
  botInfo?: TelegramBotInfo;
  /** Chat resolution info (only when auto-resolving chat ID) */
  chatResolution?: TelegramChatResolution;
}

@injectable()
export class ConfigureTelegramUseCase {
  constructor(
    @inject('ISettingsRepository')
    private readonly settingsRepository: ISettingsRepository,
    @inject('ITelegramService')
    private readonly telegramService: ITelegramService
  ) {}

  async execute(input: ConfigureTelegramInput): Promise<ConfigureTelegramResult> {
    const settings = await this.settingsRepository.load();
    if (!settings) {
      throw new Error('Settings not initialized');
    }

    const result: ConfigureTelegramResult = { settings };

    if (!input.enabled) {
      // Disable: preserve token and chatId for easy re-enable
      settings.telegram = {
        ...this.getDefaultTelegramConfig(),
        ...settings.telegram,
        enabled: false,
      };
      await this.settingsRepository.update(settings);
      return result;
    }

    // Enabling: validate bot token
    const botToken = input.botToken ?? settings.telegram?.botToken;
    if (!botToken) {
      throw new Error('Bot token is required when enabling Telegram integration');
    }

    const botInfo = await this.telegramService.validateBotToken(botToken);
    result.botInfo = botInfo;

    // Resolve chat ID if not provided
    let chatId = input.chatId ?? settings.telegram?.chatId;
    if (!chatId) {
      const chatResolution = await this.telegramService.resolveChatId(botToken);
      chatId = chatResolution.chatId;
      result.chatResolution = chatResolution;
    }

    // Merge notify events with defaults
    const currentEvents = settings.telegram?.notifyEvents ?? this.getDefaultNotifyEvents();
    const notifyEvents: TelegramNotifyEvents = {
      ...currentEvents,
      ...input.notifyEvents,
    };

    settings.telegram = {
      enabled: true,
      botToken,
      chatId,
      notifyEvents,
    };

    await this.settingsRepository.update(settings);

    // Send a test message to confirm the connection works
    await this.telegramService.sendMessage(
      botToken,
      chatId,
      `\u2705 <b>Shep connected!</b>\nBot: @${botInfo.username}\nNotifications will appear here.`
    );

    return result;
  }

  private getDefaultTelegramConfig(): TelegramConfig {
    return {
      enabled: false,
      notifyEvents: this.getDefaultNotifyEvents(),
    };
  }

  private getDefaultNotifyEvents(): TelegramNotifyEvents {
    return {
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
    };
  }
}
