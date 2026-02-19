/**
 * Error thrown when a structured agent call fails to produce valid output.
 */
export class StructuredCallError extends Error {
  constructor(
    message: string,
    public readonly code: 'parse_failed' | 'agent_error',
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = 'StructuredCallError';
  }
}
