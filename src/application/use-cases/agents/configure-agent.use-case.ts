/**
 * Configure Agent Use Case
 *
 * Configures the AI coding agent for the Shep platform.
 * Validates agent availability before persisting configuration.
 *
 * Business Rules:
 * - Agent binary must be available on the system before configuring
 * - Settings must exist before updating (must initialize first)
 * - Token is optional and only included when provided
 * - Returns updated settings after persistence
 */

import { injectable, inject } from 'tsyringe';
import type { Settings, AgentType, AgentAuthMethod } from '../../../domain/generated/output.js';
import type { ISettingsRepository } from '../../ports/output/repositories/settings-repository.interface.js';
import type { IAgentValidator } from '../../ports/output/services/agents/agent-validator.interface.js';

/**
 * Input for configuring an AI coding agent.
 */
export interface ConfigureAgentInput {
  type: AgentType;
  authMethod: AgentAuthMethod;
  token?: string;
}

/**
 * Use case for configuring the AI coding agent.
 *
 * Algorithm:
 * 1. Validate agent binary is available on the system
 * 2. Load current settings from repository
 * 3. Update agent configuration
 * 4. Persist updated settings
 * 5. Return updated settings
 */
@injectable()
export class ConfigureAgentUseCase {
  constructor(
    @inject('ISettingsRepository')
    private readonly settingsRepository: ISettingsRepository,
    @inject('IAgentValidator')
    private readonly agentValidator: IAgentValidator
  ) {}

  /**
   * Execute the configure agent use case.
   *
   * @param input - Agent configuration input
   * @returns Updated Settings with new agent configuration
   * @throws Error if agent is not available or settings not initialized
   */
  async execute(input: ConfigureAgentInput): Promise<Settings> {
    // 1. Validate agent is available
    const validation = await this.agentValidator.isAvailable(input.type);
    if (!validation.available) {
      throw new Error(
        `Agent "${input.type}" is not available: ${validation.error ?? 'binary not found'}`
      );
    }

    // 2. Load current settings
    const settings = await this.settingsRepository.load();
    if (!settings) {
      throw new Error('Settings not found. Please run initialization first.');
    }

    // 3. Update agent config
    const updatedSettings: Settings = {
      ...settings,
      agent: {
        type: input.type,
        authMethod: input.authMethod,
        ...(input.token !== undefined && { token: input.token }),
      },
      updatedAt: new Date(),
    };

    // 4. Persist
    await this.settingsRepository.update(updatedSettings);

    return updatedSettings;
  }
}
