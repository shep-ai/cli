/**
 * SessionNotFoundError Unit Tests
 *
 * TDD Phase: RED-GREEN
 */

import { describe, it, expect } from 'vitest';
import { SessionNotFoundError } from '@/domain/errors/session-not-found.error.js';

describe('SessionNotFoundError', () => {
  it('should be an instance of Error', () => {
    const error = new SessionNotFoundError('abc123');
    expect(error).toBeInstanceOf(Error);
  });

  it('should include the session ID in the message', () => {
    const error = new SessionNotFoundError('abc123');
    expect(error.message).toContain('abc123');
  });

  it('should have name set to SessionNotFoundError', () => {
    const error = new SessionNotFoundError('abc123');
    expect(error.name).toBe('SessionNotFoundError');
  });

  it('should include different session IDs in message', () => {
    const error = new SessionNotFoundError('xyz-789');
    expect(error.message).toContain('xyz-789');
  });
});
