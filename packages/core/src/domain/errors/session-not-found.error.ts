/**
 * Session Not Found Error
 *
 * Thrown by GetAgentSessionUseCase when the requested session ID
 * does not exist in the provider's local storage.
 */
export class SessionNotFoundError extends Error {
  constructor(sessionId: string) {
    super(`Session not found: ${sessionId}`);
    this.name = 'SessionNotFoundError';
    // Maintain proper prototype chain in TypeScript/ES5 targets
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
