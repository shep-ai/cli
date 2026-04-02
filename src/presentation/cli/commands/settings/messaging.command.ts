/**
 * Messaging Configuration Command
 *
 * Configures external messaging remote control via Telegram or WhatsApp
 * through the Commands.com Gateway.
 *
 * Usage:
 *   shep settings messaging             # Interactive setup wizard
 *   shep settings messaging status      # Show connection status
 *   shep settings messaging disconnect  # Disconnect messaging
 */

import { Command } from 'commander';
import { select, input, confirm } from '@inquirer/prompts';
import { container } from '@/infrastructure/di/container.js';
import { UpdateSettingsUseCase } from '@/application/use-cases/settings/update-settings.use-case.js';
import {
  getSettings,
  resetSettings,
  initializeSettings,
} from '@/infrastructure/services/settings.service.js';
import { messages } from '../../ui/index.js';
import { shepTheme } from '../../../tui/themes/shep.theme.js';

/**
 * Create the messaging configuration command.
 */
export function createMessagingCommand(): Command {
  const cmd = new Command('messaging')
    .description('Configure messaging remote control (Telegram/WhatsApp)')
    .addHelpText(
      'after',
      `
Examples:
  $ shep settings messaging             Interactive setup wizard
  $ shep settings messaging status      Show connection status
  $ shep settings messaging disconnect  Disconnect messaging`
    )
    .action(async () => {
      try {
        await runMessagingWizard();
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));

        if (err.message.includes('force closed') || err.message.includes('User force closed')) {
          messages.info('Messaging setup cancelled.');
          return;
        }

        messages.error('Failed to configure messaging', err);
        process.exitCode = 1;
      }
    });

  cmd
    .command('status')
    .description('Show messaging connection status')
    .action(() => {
      const settings = getSettings();
      const mc = settings.messaging;

      if (!mc?.enabled) {
        messages.info('Messaging remote control is not configured.');
        return;
      }

      console.log(`\nMessaging Remote Control`);
      console.log(`  Gateway: ${mc.gatewayUrl ?? 'not set'}`);
      console.log(`  Enabled: ${mc.enabled}`);

      if (mc.telegram) {
        console.log(
          `  Telegram: ${mc.telegram.enabled ? 'enabled' : 'disabled'} (${mc.telegram.paired ? 'paired' : 'not paired'})`
        );
      }

      if (mc.whatsapp) {
        console.log(
          `  WhatsApp: ${mc.whatsapp.enabled ? 'enabled' : 'disabled'} (${mc.whatsapp.paired ? 'paired' : 'not paired'})`
        );
      }

      console.log('');
    });

  cmd
    .command('disconnect')
    .description('Disconnect all messaging platforms')
    .action(async () => {
      try {
        const settings = getSettings();
        settings.messaging = {
          enabled: false,
          debounceMs: 5000,
          chatBufferMs: 3000,
        };

        const useCase = container.resolve(UpdateSettingsUseCase);
        const updated = await useCase.execute(settings);
        resetSettings();
        initializeSettings(updated);

        messages.success('Messaging remote control disconnected.');
      } catch (error) {
        messages.error(
          'Failed to disconnect messaging',
          error instanceof Error ? error : new Error(String(error))
        );
        process.exitCode = 1;
      }
    });

  return cmd;
}

async function runMessagingWizard(): Promise<void> {
  const settings = getSettings();

  const platform = await select<string>({
    message: 'Which platform would you like to connect?',
    choices: [
      { name: 'Telegram', value: 'telegram' },
      { name: 'WhatsApp', value: 'whatsapp' },
      { name: 'Disconnect all', value: 'disconnect' },
    ],
    theme: shepTheme,
  });

  if (platform === 'disconnect') {
    settings.messaging = {
      enabled: false,
      debounceMs: 5000,
      chatBufferMs: 3000,
    };

    const useCase = container.resolve(UpdateSettingsUseCase);
    const updated = await useCase.execute(settings);
    resetSettings();
    initializeSettings(updated);

    messages.success('Messaging remote control disconnected.');
    return;
  }

  // Get Gateway URL
  const gatewayUrl = await input({
    message: 'Enter your Gateway URL:',
    default: settings.messaging?.gatewayUrl ?? '',
    validate: (value: string) => {
      if (!value.trim()) return 'Gateway URL is required';
      try {
        new URL(value);
        return true;
      } catch {
        return 'Please enter a valid URL (e.g., https://my-gateway.railway.app)';
      }
    },
    theme: shepTheme,
  });

  const platformConfig = {
    enabled: true,
    paired: false,
    chatId: undefined,
  };

  // Update settings
  settings.messaging = {
    ...settings.messaging,
    enabled: true,
    gatewayUrl,
    debounceMs: settings.messaging?.debounceMs ?? 5000,
    chatBufferMs: settings.messaging?.chatBufferMs ?? 3000,
    [platform]: platformConfig,
  };

  const useCase = container.resolve(UpdateSettingsUseCase);
  const updated = await useCase.execute(settings);
  resetSettings();
  initializeSettings(updated);

  messages.success(`${platform === 'telegram' ? 'Telegram' : 'WhatsApp'} messaging configured.`);
  messages.info('Next steps:');
  console.log('  1. Deploy the Commands.com Gateway (if not already running)');
  console.log('  2. Create integration routes on the Gateway for this platform');
  console.log(`  3. Restart the Shep daemon to activate messaging`);

  const shouldTest = await confirm({
    message: 'Would you like to test the connection?',
    default: false,
    theme: shepTheme,
  });

  if (shouldTest) {
    messages.info('Connection test will be available after daemon restart with messaging enabled.');
  }
}
