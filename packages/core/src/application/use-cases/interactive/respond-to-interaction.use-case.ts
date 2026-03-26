/**
 * Respond To Interaction Use Case
 *
 * Sends the user's response to a pending AskUserQuestion interaction
 * back to the agent. The agent's turn resumes after receiving the response.
 */

import { injectable, inject } from 'tsyringe';
import type { IInteractiveSessionService } from '../../ports/output/services/interactive-session-service.interface.js';

export interface RespondToInteractionInput {
  featureId: string;
  answers: Record<string, string>;
}

@injectable()
export class RespondToInteractionUseCase {
  constructor(
    @inject('IInteractiveSessionService')
    private readonly service: IInteractiveSessionService
  ) {}

  async execute(input: RespondToInteractionInput): Promise<void> {
    return this.service.respondToInteraction(input.featureId, input.answers);
  }
}
