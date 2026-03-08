/**
 * Model Configuration Command
 *
 * Configures the default LLM model used for feature runs.
 * The command resolves the list of supported models from the configured agent
 * and presents an interactive prompt — no Shep-side validation against
 * the advertised list, as users may enter newly released identifiers.
 *
 * Usage:
 *   shep settings model   # Interactive model picker
 */

import { Command } from 'commander';
import { select } from '@inquirer/prompts';
import { container } from '@/infrastructure/di/container.js';
import type { IAgentExecutorFactory } from '@/application/ports/output/agents/agent-executor-factory.interface.js';
import { UpdateSettingsUseCase } from '@/application/use-cases/settings/update-settings.use-case.js';
import {
  getSettings,
  resetSettings,
  initializeSettings,
} from '@/infrastructure/services/settings.service.js';
import { messages } from '../../ui/index.js';

/**
 * Create the model configuration command.
 */
export function createModelCommand(): Command {
  return new Command('model')
    .description('Configure the default LLM model for agent runs')
    .addHelpText(
      'after',
      `
Examples:
  $ shep settings model   Interactive model picker`
    )
    .action(async () => {
      try {
        const factory = container.resolve<IAgentExecutorFactory>('IAgentExecutorFactory');
        const settings = getSettings();
        const agentType = settings.agent.type;
        const supportedModels = factory.getSupportedModels(agentType);

        if (supportedModels.length === 0) {
          messages.info(
            `No models available for agent "${agentType}". Configure a different agent with: shep settings agent`
          );
          return;
        }

        const currentModel = settings.models.default;

        const selectedModel = await select<string>({
          message: 'Select default LLM model',
          choices: supportedModels.map((m) => ({ name: m, value: m })),
          default: currentModel,
        });

        // Persist via UpdateSettingsUseCase
        settings.models.default = selectedModel;
        const useCase = container.resolve(UpdateSettingsUseCase);
        const updatedSettings = await useCase.execute(settings);

        // Refresh in-memory singleton
        resetSettings();
        initializeSettings(updatedSettings);

        messages.success(`Model configured: ${selectedModel}`);
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));

        if (err.message.includes('force closed') || err.message.includes('User force closed')) {
          messages.info('Configuration cancelled.');
          return;
        }

        messages.error('Failed to configure model', err);
        process.exitCode = 1;
      }
    });
}
