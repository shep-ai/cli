/**
 * Stub Session Repository
 *
 * Placeholder implementation of IAgentSessionRepository for agent providers
 * that do not yet have a real session-listing implementation (Cursor, Gemini CLI).
 *
 * isSupported() returns false, signalling to the use case that a warning should
 * be emitted and an empty result returned.
 */

import { injectable } from 'tsyringe';
import type { AgentSession, AgentType } from '../../../../domain/generated/output.js';
import type {
  IAgentSessionRepository,
  ListSessionsOptions,
  GetSessionOptions,
} from '../../../../application/ports/output/agents/agent-session-repository.interface.js';

@injectable()
export class StubSessionRepository implements IAgentSessionRepository {
  constructor(private readonly agentType: AgentType) {}

  isSupported(): boolean {
    return false;
  }

  async list(_options?: ListSessionsOptions): Promise<AgentSession[]> {
    return [];
  }

  async findById(_id: string, _options?: GetSessionOptions): Promise<AgentSession | null> {
    return null;
  }
}
