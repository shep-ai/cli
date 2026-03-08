'use server';

import { resolve } from '@/lib/server-container';
import { getSettings } from '@shepai/core/infrastructure/services/settings.service';
import type { IAgentExecutorFactory } from '@shepai/core/application/ports/output/agents/agent-executor-factory.interface';

/**
 * Server action that returns the LLM model identifiers supported by the
 * currently configured agent executor.
 *
 * Resolves IAgentExecutorFactory from the DI container and calls
 * getSupportedModels for the agent type stored in settings.
 *
 * @returns Array of model identifier strings, or [] on error.
 */
export async function getSupportedModels(): Promise<string[]> {
  try {
    const settings = getSettings();
    const agentType = settings.agent.type;
    const factory = resolve<IAgentExecutorFactory>('IAgentExecutorFactory');
    return factory.getSupportedModels(agentType);
  } catch (_error: unknown) {
    // Settings may not be initialized in some test/preview environments
    return [];
  }
}
