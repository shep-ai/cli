/**
 * Agent Executor Factory Interface
 *
 * Output port for creating agent executor instances based on agent type.
 * Infrastructure layer provides concrete implementations that wire up
 * the appropriate executor for each supported agent.
 *
 * Following Clean Architecture:
 * - Domain and Application layers depend on this interface
 * - Infrastructure layer provides concrete implementations
 *
 * @example
 * ```typescript
 * const factory: IAgentExecutorFactory = container.resolve('IAgentExecutorFactory');
 * const supported = factory.getSupportedAgents();
 * const executor = factory.createExecutor(AgentType.ClaudeCode, settings.agent);
 * ```
 */

import type { AgentType, AgentConfig } from '@/domain/generated/output.js';
import type { IAgentExecutor } from './agent-executor.interface.js';

/**
 * Port interface for creating agent executor instances.
 *
 * Implementations must:
 * - Create the correct executor for the given agent type
 * - Configure the executor with the provided auth configuration
 * - Report which agent types are supported
 */
export interface IAgentExecutorFactory {
  /**
   * Create an executor for the specified agent type.
   *
   * @param agentType - The type of agent to create an executor for
   * @param authConfig - Agent authentication and configuration
   * @returns A configured agent executor
   */
  createExecutor(agentType: AgentType, authConfig: AgentConfig): IAgentExecutor;

  /**
   * Get the list of agent types this factory can create executors for.
   *
   * @returns Array of supported agent types
   */
  getSupportedAgents(): AgentType[];
}
