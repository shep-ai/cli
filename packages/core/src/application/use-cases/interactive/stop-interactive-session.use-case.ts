/**
 * Stop Interactive Session Use Case
 *
 * Stops the active interactive agent session for a feature.
 * Kills the agent process and marks the session as stopped.
 * Idempotent — no-op if no active session exists.
 */

import { injectable, inject } from 'tsyringe';
import type { IInteractiveSessionService } from '../../ports/output/services/interactive-session-service.interface.js';

/**
 * Input for stopping an interactive session.
 */
export interface StopInteractiveSessionInput {
  featureId: string;
}

/**
 * Use case for stopping the active interactive session for a feature.
 *
 * Algorithm:
 * 1. Delegate to service.stopByFeature
 * 2. The service handles process cleanup and DB status update
 */
@injectable()
export class StopInteractiveSessionUseCase {
  constructor(
    @inject('IInteractiveSessionService')
    private readonly service: IInteractiveSessionService
  ) {}

  async execute(input: StopInteractiveSessionInput): Promise<void> {
    return this.service.stopByFeature(input.featureId);
  }
}
