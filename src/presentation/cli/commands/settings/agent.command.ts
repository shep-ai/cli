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
import { container } from '../../../../infrastructure/di/container.js';
import type { ILogger } from '../../../../application/ports/output/logger.interface.js';
import {
  ConfigureAgentUseCase,
  type ConfigureAgentInput,
} from '../../../../application/use-cases/agents/configure-agent.use-case.js';
import { agentConfigWizard } from '../../../tui/wizards/agent-config.wizard.js';
import {
  resetSettings,
  initializeSettings,
} from '../../../../infrastructure/services/settings.service.js';
import { messages } from '../../ui/index.js';

/**
 * Create the agent configuration command
 */
export function createAgentCommand(): Command {
  return new Command('agent')
    .description('Configure AI coding agent')
    .option('--agent <type>', 'Agent type (e.g., claude-code)')
    .option('--auth <method>', 'Auth method (session or token)')
    .option('--token <key>', 'API token for token-based auth')
    .addHelpText(
      'after',
      `
Examples:
  $ shep settings agent                                          Interactive wizard
  $ shep settings agent --agent claude-code --auth session       Non-interactive
  $ shep settings agent --agent claude-code --auth token --token sk-xxx  Token auth`
    )
    .action(async (options: { agent?: string; auth?: string; token?: string }) => {
      const logger = container.resolve<ILogger>('ILogger');
      try {
        const isNonInteractive = options.agent !== undefined;
        logger.debug('Configuring agent', {
          source: 'cli:settings:agent',
          interactive: !isNonInteractive,
          agentType: options.agent,
        });

        let input: ConfigureAgentInput;

        if (isNonInteractive) {
          // Non-interactive: require --auth when --agent is provided
          if (!options.auth) {
            logger.warn('Missing required --auth flag', { source: 'cli:settings:agent' });
            messages.error('--auth is required when using --agent flag');
            process.exitCode = 1;
            return;
          }

          input = {
            type: options.agent,
            authMethod: options.auth,
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

        logger.info('Agent configured successfully', {
          source: 'cli:settings:agent',
          agentType: input.type,
          authMethod: input.authMethod,
        });
        messages.success(`Agent configured: ${input.type} (${input.authMethod})`);
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));

        // Handle user cancellation (Ctrl+C) gracefully
        if (err.message.includes('force closed') || err.message.includes('User force closed')) {
          logger.info('Agent configuration cancelled by user', { source: 'cli:settings:agent' });
          messages.info('Configuration cancelled.');
          return;
        }

        logger.error('Failed to configure agent', {
          source: 'cli:settings:agent',
          error: err.message,
          stack: err.stack,
        });
        messages.error('Failed to configure agent', err);
        process.exitCode = 1;
      }
    });
}
