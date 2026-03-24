/**
 * Concurrent Session Limit Error
 *
 * Thrown by InteractiveSessionService.startSession() when the number of
 * active sessions (status 'booting' or 'ready') has reached the configured
 * maximum. The API route translates this to HTTP 429.
 */
export class ConcurrentSessionLimitError extends Error {
  constructor(
    public readonly activeSessions: number,
    public readonly cap: number
  ) {
    super(
      `Cannot start a new session: ${activeSessions} of ${cap} allowed concurrent sessions are active. Stop an existing session first.`
    );
    this.name = 'ConcurrentSessionLimitError';
    // Maintain proper prototype chain in TypeScript/ES5 targets
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
