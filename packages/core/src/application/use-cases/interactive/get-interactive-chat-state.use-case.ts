/**
 * Get Interactive Chat State Use Case
 *
 * Returns the complete chat state for a feature: messages, session status,
 * in-flight streaming text, and session metadata. Single call for the frontend.
 */

import { injectable, inject } from 'tsyringe';
import type {
  IInteractiveSessionService,
  ChatState,
} from '../../ports/output/services/interactive-session-service.interface.js';

/**
 * Input for getting interactive chat state.
 */
export interface GetInteractiveChatStateInput {
  featureId: string;
}

/**
 * Use case for retrieving the complete chat state for a feature.
 *
 * Algorithm:
 * 1. Delegate to service.getChatState
 * 2. Return merged state (messages + session status + streaming text)
 */
@injectable()
export class GetInteractiveChatStateUseCase {
  constructor(
    @inject('IInteractiveSessionService')
    private readonly service: IInteractiveSessionService
  ) {}

  async execute(input: GetInteractiveChatStateInput): Promise<ChatState> {
    return this.service.getChatState(input.featureId);
  }
}
