/**
 * Start Interactive Session Use Case
 *
 * Starts a new interactive agent session for a feature.
 * Delegates to the interactive session service for session lifecycle management.
 */

import { injectable, inject } from 'tsyringe';
import type { IInteractiveSessionService } from '../../ports/output/services/interactive-session-service.interface.js';
import type { InteractiveSession } from '../../../domain/generated/output.js';

/**
 * Input for starting an interactive session.
 */
export interface StartInteractiveSessionInput {
  featureId: string;
  worktreePath: string;
  /** Agent type for forward compatibility — will be used in Phase 3 when the service is refactored. */
  agentType?: string;
  /** Model override, e.g. 'claude-sonnet-4-6' */
  model?: string;
}

/**
 * Use case for starting a new interactive agent session.
 *
 * Algorithm:
 * 1. Delegate to the service with featureId and worktreePath
 * 2. Return the created session record
 *
 * @throws ConcurrentSessionLimitError when the configured session cap is reached
 */
@injectable()
export class StartInteractiveSessionUseCase {
  constructor(
    @inject('IInteractiveSessionService')
    private readonly service: IInteractiveSessionService
  ) {}

  async execute(input: StartInteractiveSessionInput): Promise<InteractiveSession> {
    // agentType and model will be forwarded to the service in Phase 3
    return this.service.startSession(input.featureId, input.worktreePath);
  }
}
