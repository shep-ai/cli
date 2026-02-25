/**
 * Agent Executor Factory Service
 *
 * Infrastructure implementation of the IAgentExecutorFactory port.
 * Creates and caches agent executor instances based on agent type.
 *
 * Uses constructor dependency injection for the spawn function
 * to enable testability without mocking node:child_process directly.
 */

import type { AgentType, AgentConfig } from '../../../../domain/generated/output.js';
import type { IAgentExecutor } from '../../../../application/ports/output/agents/agent-executor.interface.js';
import type { IAgentExecutorFactory } from '../../../../application/ports/output/agents/agent-executor-factory.interface.js';
import { ClaudeCodeExecutorService } from './executors/claude-code-executor.service.js';
import { CursorExecutorService } from './executors/cursor-executor.service.js';
import { DevAgentExecutorService } from './executors/dev-executor.service.js';
import { GeminiCliExecutorService } from './executors/gemini-cli-executor.service.js';
import type { SpawnFunction } from './types.js';

/**
 * Factory that creates and caches agent executor instances.
 *
 * Executor instances are cached per agent type (singleton per type)
 * to avoid unnecessary re-creation of stateless executors.
 */
export class AgentExecutorFactory implements IAgentExecutorFactory {
  private readonly cache = new Map<string, IAgentExecutor>();

  /**
   * @param spawn - Spawn function for creating subprocesses (injectable for testing).
   */
  constructor(private readonly spawn: SpawnFunction) {}

  /**
   * Create (or return cached) executor for the specified agent type.
   *
   * @param agentType - The type of agent to create an executor for
   * @param _authConfig - Agent authentication and configuration
   * @returns A configured agent executor
   * @throws Error if the agent type is not supported
   */
  createExecutor(agentType: AgentType, _authConfig: AgentConfig): IAgentExecutor {
    const key = agentType as string;
    const cached = this.cache.get(key);
    if (cached) return cached;

    let executor: IAgentExecutor;
    switch (key) {
      case 'claude-code':
        executor = new ClaudeCodeExecutorService(this.spawn);
        break;
      case 'cursor':
        executor = new CursorExecutorService(this.spawn);
        break;
      case 'dev':
        executor = new DevAgentExecutorService();
        break;
      case 'gemini-cli':
        executor = new GeminiCliExecutorService(this.spawn, _authConfig);
        break;
      default:
        throw new Error(
          `Unsupported agent type: ${agentType}. Supported: ${this.getSupportedAgents().join(', ')}`
        );
    }

    this.cache.set(key, executor);
    return executor;
  }

  /**
   * Get the list of agent types this factory can create executors for.
   *
   * @returns Array of supported agent types
   */
  getSupportedAgents(): AgentType[] {
    return [
      'claude-code' as AgentType,
      'cursor' as AgentType,
      'dev' as AgentType,
      'gemini-cli' as AgentType,
    ];
  }
}
