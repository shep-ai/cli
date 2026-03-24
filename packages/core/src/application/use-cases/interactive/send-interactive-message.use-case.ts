/**
 * Send Interactive Message Use Case
 *
 * Sends a user message to the interactive session for a feature.
 * The service handles session lifecycle: starts a session if needed,
 * queues the message if the session is booting, or delivers immediately
 * if the session is ready.
 */

import { injectable, inject } from 'tsyringe';
import type { IInteractiveSessionService } from '../../ports/output/services/interactive-session-service.interface.js';
import type { InteractiveMessage } from '../../../domain/generated/output.js';

/**
 * Input for sending a message to an interactive session.
 */
export interface SendInteractiveMessageInput {
  featureId: string;
  content: string;
  worktreePath: string;
}

/**
 * Use case for sending a user message to an interactive agent session.
 *
 * Algorithm:
 * 1. Delegate to service.sendUserMessage with featureId, content, worktreePath
 * 2. Return the persisted user message
 */
@injectable()
export class SendInteractiveMessageUseCase {
  constructor(
    @inject('IInteractiveSessionService')
    private readonly service: IInteractiveSessionService
  ) {}

  async execute(input: SendInteractiveMessageInput): Promise<InteractiveMessage> {
    return this.service.sendUserMessage(input.featureId, input.content, input.worktreePath);
  }
}
