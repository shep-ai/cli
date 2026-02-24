/**
 * Agent Session Repository Registry
 *
 * Application-layer service that resolves the correct IAgentSessionRepository
 * implementation for a given AgentType via string DI tokens.
 *
 * Token scheme: "IAgentSessionRepository:<agentType>"
 * Example: "IAgentSessionRepository:claude-code" → ClaudeCodeSessionRepository
 *
 * Use cases inject this registry — never concrete repository classes directly.
 * Adding a new provider requires only registering a new token in the container.
 */

import { injectable } from 'tsyringe';
import { container } from 'tsyringe';
import type { AgentType } from '../../../domain/generated/output.js';
import type { IAgentSessionRepository } from '../../ports/output/agents/agent-session-repository.interface.js';

@injectable()
export class AgentSessionRepositoryRegistry {
  /**
   * Resolve the session repository for the given agent type.
   *
   * @param agentType - The agent type to resolve a repository for
   * @returns The IAgentSessionRepository implementation for the agent type
   */
  getRepository(agentType: AgentType): IAgentSessionRepository {
    return container.resolve<IAgentSessionRepository>(`IAgentSessionRepository:${agentType}`);
  }
}
