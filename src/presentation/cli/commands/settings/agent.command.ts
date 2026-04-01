/**
 * Agent Configuration Command
 *
 * Configures the AI coding agent used by Shep for all LLM-powered operations.
 *
 * Usage:
 *   shep settings agent                                          # Interactive wizard
 *   shep settings agent --agent claude-code --auth session       # Non-interactive
 *   shep settings agent --agent claude-code --auth token --token sk-xxx  # Token auth
 */

import { Command } from 'commander';
import { container } from '@/infrastructure/di/container.js';
import {
  ConfigureAgentUseCase,
  type ConfigureAgentInput,
} from '@/application/use-cases/agents/configure-agent.use-case.js';
import { agentConfigWizard } from '../../../tui/wizards/agent-config.wizard.js';
import { resetSettings, initializeSettings } from '@/infrastructure/services/settings.service.js';
import { messages } from '../../ui/index.js';
import { getCliI18n } from '../../i18n.js';

/**
 * Create the agent configuration command
 */
export function createAgentCommand(): Command {
  return new Command('agent')
    .description(getCliI18n().t('cli:commands.settings.agent.description'))
    .option('--agent <type>', getCliI18n().t('cli:commands.settings.agent.agentOption'))
    .option('--auth <method>', getCliI18n().t('cli:commands.settings.agent.authOption'))
    .option('--token <key>', getCliI18n().t('cli:commands.settings.agent.tokenOption'))
    .addHelpText(
      'after',
      `
Examples:
  $ shep settings agent                                          Interactive wizard
  $ shep settings agent --agent claude-code --auth session       Non-interactive
  $ shep settings agent --agent claude-code --auth token --token sk-xxx  Token auth`
    )
    .action(async (options: { agent?: string; auth?: string; token?: string }) => {
      try {
        const isNonInteractive = options.agent !== undefined;

        let input: ConfigureAgentInput;

        if (isNonInteractive) {
          // Non-interactive: require --auth when --agent is provided (dev type defaults to session)
          if (!options.auth && options.agent !== 'dev') {
            messages.error(getCliI18n().t('cli:commands.settings.agent.authRequired'));
            process.exitCode = 1;
            return;
          }

          input = {
            type: options.agent,
            authMethod: options.auth ?? 'session',
            ...(options.token !== undefined && { token: options.token }),
          } as ConfigureAgentInput;
        } else {
          // Interactive: launch wizard
          const wizardResult = await agentConfigWizard();
          input = {
            type: wizardResult.type,
            authMethod: wizardResult.authMethod,
            ...(wizardResult.token !== undefined && { token: wizardResult.token }),
          };
        }

        const useCase = container.resolve(ConfigureAgentUseCase);
        const updatedSettings = await useCase.execute(input);

        // Update the in-memory settings singleton
        resetSettings();
        initializeSettings(updatedSettings);

        messages.success(
          getCliI18n().t('cli:commands.settings.agent.success', {
            type: input.type,
            authMethod: input.authMethod,
          })
        );
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));

        // Handle user cancellation (Ctrl+C) gracefully
        if (err.message.includes('force closed') || err.message.includes('User force closed')) {
          messages.info(getCliI18n().t('cli:commands.settings.agent.cancelled'));
          return;
        }

        messages.error(getCliI18n().t('cli:commands.settings.agent.failed'), err);
        process.exitCode = 1;
      }
    });
}
