/**
 * @module Tests.Helpers.MockLogger
 *
 * Provides a reusable mock logger factory and assertion helpers for testing.
 *
 * ## Usage
 *
 * ```typescript
 * import { createMockLogger, expectLoggedInfo } from '@/tests/helpers/mock-logger';
 *
 * describe('MyService', () => {
 *   it('should log user creation', () => {
 *     const logger = createMockLogger();
 *     const service = new MyService(logger);
 *
 *     service.createUser({ name: 'Alice' });
 *
 *     expectLoggedInfo(logger, 'User created', { name: 'Alice' });
 *   });
 * });
 * ```
 */

import { vi, expect } from 'vitest';
import type { ILogger } from '@/application/ports/output/logger.interface';

/**
 * Create a mock logger instance for testing.
 *
 * Returns an ILogger implementation with all methods replaced by Vitest mocks.
 * Mock methods can be inspected using `expect().toHaveBeenCalledWith()` assertions.
 *
 * @returns Mock logger with all ILogger methods mocked
 *
 * @example
 * ```typescript
 * const logger = createMockLogger();
 * logger.info('User logged in', { userId: '123' });
 *
 * expect(logger.info).toHaveBeenCalledWith('User logged in', { userId: '123' });
 * ```
 */
export function createMockLogger(): ILogger {
  return {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  };
}

/**
 * Assert that a debug message was logged.
 *
 * @param logger - Mock logger instance from createMockLogger()
 * @param message - Expected log message
 * @param context - Optional expected context object
 *
 * @throws {Error} If the debug method was not called with the expected arguments
 *
 * @example
 * ```typescript
 * const logger = createMockLogger();
 * logger.debug('Query executed', { duration: 45 });
 *
 * expectLoggedDebug(logger, 'Query executed');
 * expectLoggedDebug(logger, 'Query executed', { duration: 45 });
 * ```
 */
export function expectLoggedDebug(
  logger: ILogger,
  message: string,
  context?: Record<string, unknown>
): void {
  if (context !== undefined) {
    expect(logger.debug).toHaveBeenCalledWith(message, context);
  } else {
    expect(logger.debug).toHaveBeenCalledWith(message, expect.anything());
  }
}

/**
 * Assert that an info message was logged.
 *
 * @param logger - Mock logger instance from createMockLogger()
 * @param message - Expected log message
 * @param context - Optional expected context object
 *
 * @throws {Error} If the info method was not called with the expected arguments
 *
 * @example
 * ```typescript
 * const logger = createMockLogger();
 * logger.info('User created', { userId: '123' });
 *
 * expectLoggedInfo(logger, 'User created');
 * expectLoggedInfo(logger, 'User created', { userId: '123' });
 * ```
 */
export function expectLoggedInfo(
  logger: ILogger,
  message: string,
  context?: Record<string, unknown>
): void {
  if (context !== undefined) {
    expect(logger.info).toHaveBeenCalledWith(message, context);
  } else {
    expect(logger.info).toHaveBeenCalledWith(message, expect.anything());
  }
}

/**
 * Assert that a warning message was logged.
 *
 * @param logger - Mock logger instance from createMockLogger()
 * @param message - Expected log message
 * @param context - Optional expected context object
 *
 * @throws {Error} If the warn method was not called with the expected arguments
 *
 * @example
 * ```typescript
 * const logger = createMockLogger();
 * logger.warn('API rate limit approaching', { remaining: 10 });
 *
 * expectLoggedWarn(logger, 'API rate limit approaching');
 * expectLoggedWarn(logger, 'API rate limit approaching', { remaining: 10 });
 * ```
 */
export function expectLoggedWarn(
  logger: ILogger,
  message: string,
  context?: Record<string, unknown>
): void {
  if (context !== undefined) {
    expect(logger.warn).toHaveBeenCalledWith(message, context);
  } else {
    expect(logger.warn).toHaveBeenCalledWith(message, expect.anything());
  }
}

/**
 * Assert that an error message was logged.
 *
 * @param logger - Mock logger instance from createMockLogger()
 * @param message - Expected log message
 * @param context - Optional expected context object
 *
 * @throws {Error} If the error method was not called with the expected arguments
 *
 * @example
 * ```typescript
 * const logger = createMockLogger();
 * logger.error('Failed to save settings', { error: 'connection lost' });
 *
 * expectLoggedError(logger, 'Failed to save settings');
 * expectLoggedError(logger, 'Failed to save settings', { error: 'connection lost' });
 * ```
 */
export function expectLoggedError(
  logger: ILogger,
  message: string,
  context?: Record<string, unknown>
): void {
  if (context !== undefined) {
    expect(logger.error).toHaveBeenCalledWith(message, context);
  } else {
    expect(logger.error).toHaveBeenCalledWith(message, expect.anything());
  }
}
