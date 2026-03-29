/**
 * Telegram Configuration Command
 *
 * Configures the Telegram Bot integration for remote control and notifications.
 *
 * Usage:
 *   shep settings telegram                                   # Interactive setup
 *   shep settings telegram --bot-token <token>               # Set token + auto-pair
 *   shep settings telegram --bot-token <token> --chat-id 123 # Set token + explicit chat
 *   shep settings telegram --disable                          # Disable Telegram
 *   shep settings telegram --status                           # Show current status
 */

import { Command } from 'commander';
import { input, confirm } from '@inquirer/prompts';
import type { ITelegramService } from '@/application/ports/output/services/telegram-service.interface.js';
import { container } from '@/infrastructure/di/container.js';
import { ConfigureTelegramUseCase } from '@/application/use-cases/telegram/configure-telegram.use-case.js';
import {
  getSettings,
  resetSettings,
  initializeSettings,
} from '@/infrastructure/services/settings.service.js';
import { messages, colors, fmt, symbols } from '../../ui/index.js';

interface TelegramOptions {
  botToken?: string;
  chatId?: string;
  disable?: true;
  status?: true;
}

/**
 * Create the Telegram configuration command.
 */
export function createTelegramCommand(): Command {
  return new Command('telegram')
    .description('Configure Telegram remote control and notifications')
    .option('--bot-token <token>', 'Bot API token from @BotFather')
    .option('--chat-id <id>', 'Telegram chat ID (auto-resolved if omitted)')
    .option('--disable', 'Disable Telegram integration')
    .option('--status', 'Show current Telegram configuration status')
    .addHelpText(
      'after',
      `
Examples:
  $ shep settings telegram                                   Interactive setup wizard
  $ shep settings telegram --bot-token 123456:ABC-DEF...     Set token and auto-pair
  $ shep settings telegram --disable                          Disable Telegram
  $ shep settings telegram --status                           Show current status

Setup guide:
  1. Open Telegram and search for @BotFather
  2. Send /newbot and follow the prompts to create a bot
  3. Copy the bot token (looks like 123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11)
  4. Start a chat with your new bot and send /start
  5. Run: shep settings telegram --bot-token <your-token>`
    )
    .action(async (options: TelegramOptions) => {
      try {
        if (options.status) {
          showTelegramStatus();
          return;
        }

        if (options.disable) {
          await disableTelegram();
          return;
        }

        const hasFlags = options.botToken !== undefined;

        if (hasFlags) {
          await enableTelegramNonInteractive(options);
        } else {
          await enableTelegramInteractive();
        }
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));

        if (err.message.includes('force closed') || err.message.includes('User force closed')) {
          messages.info('Configuration cancelled.');
          return;
        }

        messages.error('Failed to configure Telegram', err);
        process.exitCode = 1;
      }
    });
}

function showTelegramStatus(): void {
  const settings = getSettings();
  const telegram = settings.telegram;

  if (!telegram?.enabled) {
    messages.info('Telegram integration is disabled.');
    return;
  }

  console.log(`\n${symbols.success} Telegram integration is ${colors.success('enabled')}`);
  console.log(
    `  Bot token: ${colors.muted(telegram.botToken ? `****${telegram.botToken.slice(-8)}` : 'not set')}`
  );
  console.log(`  Chat ID:   ${colors.muted(telegram.chatId ?? 'not set')}`);

  const enabledEvents = Object.entries(telegram.notifyEvents)
    .filter(([, enabled]) => enabled)
    .map(([key]) => key);

  console.log(
    `  Events:    ${colors.muted(enabledEvents.length > 0 ? enabledEvents.join(', ') : 'none')}\n`
  );
}

async function disableTelegram(): Promise<void> {
  const useCase = container.resolve(ConfigureTelegramUseCase);
  const result = await useCase.execute({ enabled: false });

  resetSettings();
  initializeSettings(result.settings);

  messages.success('Telegram integration disabled.');
}

async function enableTelegramNonInteractive(options: TelegramOptions): Promise<void> {
  if (!options.botToken) {
    messages.error('--bot-token is required when enabling Telegram.');
    process.exitCode = 1;
    return;
  }

  const useCase = container.resolve(ConfigureTelegramUseCase);

  messages.info('Validating bot token...');

  const result = await useCase.execute({
    enabled: true,
    botToken: options.botToken,
    chatId: options.chatId,
  });

  resetSettings();
  initializeSettings(result.settings);

  if (result.botInfo) {
    messages.success(`Connected to @${result.botInfo.username}`);
  }
  if (result.chatResolution) {
    messages.success(
      `Paired with ${result.chatResolution.firstName} (chat ID: ${result.chatResolution.chatId})`
    );
  }
  messages.success('Telegram integration enabled. Check your Telegram for a confirmation message.');
}

async function enableTelegramInteractive(): Promise<void> {
  console.log(`\n${fmt.heading('Telegram Remote Control Setup')}\n`);
  console.log(`${colors.muted('This wizard will connect Shep to your personal Telegram bot.')}`);
  console.log(
    `${colors.muted('You will receive notifications and can send commands via Telegram.\n')}`
  );
  console.log(`${colors.muted('Prerequisites:')}`);
  console.log(`${colors.muted('  1. Create a bot via @BotFather on Telegram')}`);
  console.log(`${colors.muted('  2. Send /start to your new bot')}\n`);

  const botToken = await input({
    message: 'Enter your bot token from @BotFather:',
    validate: (value) => {
      if (!value.trim()) return 'Bot token is required';
      if (!value.includes(':')) return 'Invalid bot token format (should contain ":")';
      return true;
    },
  });

  const useCase = container.resolve(ConfigureTelegramUseCase);

  messages.info('Validating bot token...');

  const result = await useCase.execute({
    enabled: true,
    botToken: botToken.trim(),
  });

  resetSettings();
  initializeSettings(result.settings);

  if (result.botInfo) {
    messages.success(`Connected to @${result.botInfo.username}`);
  }
  if (result.chatResolution) {
    messages.success(
      `Paired with ${result.chatResolution.firstName} (chat ID: ${result.chatResolution.chatId})`
    );
  }

  messages.success('Telegram integration enabled! Check your Telegram for a confirmation message.');

  const wantTest = await confirm({
    message: 'Send a test notification?',
    default: false,
  });

  if (wantTest) {
    const telegramSvc = container.resolve<ITelegramService>('ITelegramService');
    const telegram = result.settings.telegram!;
    await telegramSvc.sendMessage(
      telegram.botToken!,
      telegram.chatId!,
      '\u{1F6CE}\uFE0F <b>Test notification from Shep!</b>\nIf you see this, everything is working.'
    );
    messages.success('Test notification sent!');
  }
}
