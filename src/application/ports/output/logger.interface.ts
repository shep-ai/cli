/**
 * @module Application.Ports.Output.Logger
 *
 * Defines the output port interface for structured logging throughout the application.
 * This interface abstracts the logging implementation details from the application layer.
 *
 * ## Usage
 *
 * Use dependency injection to inject ILogger into services, use cases, and other components:
 *
 * ```typescript
 * import { injectable, inject } from 'tsyringe';
 * import { ILogger } from '@/application/ports/output/logger.interface';
 *
 * @injectable()
 * export class MyService {
 *   constructor(@inject('ILogger') private logger: ILogger) {}
 *
 *   async execute(): Promise<void> {
 *     this.logger.info('Executing service', { userId: '123' });
 *     try {
 *       // ... do work
 *       this.logger.debug('Service executed successfully');
 *     } catch (error) {
 *       this.logger.error('Service execution failed', { error });
 *     }
 *   }
 * }
 * ```
 *
 * ## Log Levels
 *
 * - **debug**: Verbose debugging information (not shown in production)
 * - **info**: General informational messages
 * - **warn**: Warning messages for potentially problematic situations
 * - **error**: Error messages for failures and exceptions
 *
 * ## Context Objects
 *
 * Always use structured context objects instead of string interpolation:
 *
 * ```typescript
 * // ✅ Good - structured context
 * logger.info('User created', { userId: '123', email: 'user@example.com' });
 *
 * // ❌ Bad - string interpolation
 * logger.info(`User ${userId} created with email ${email}`);
 * ```
 *
 * Structured logging enables:
 * - Full-text search on specific fields
 * - Filtering by context values
 * - JSON export for log aggregation
 * - Better queryability in log management systems
 */

/**
 * Structured logger interface for application-wide logging.
 *
 * All application, infrastructure, and presentation layer components
 * should use this interface for logging instead of console.* methods.
 *
 * Implementations should:
 * - Write logs to appropriate transports (console, file, database)
 * - Include timestamps and log levels automatically
 * - Support structured context objects
 * - Redact sensitive data (passwords, tokens, API keys)
 * - Handle errors gracefully (logging should never crash the app)
 */
export interface ILogger {
  /**
   * Log a debug message with optional context.
   *
   * Debug messages are verbose and typically only shown in development.
   * Use for detailed information useful for debugging.
   *
   * @param message - Human-readable log message
   * @param context - Optional structured context object
   *
   * @example
   * ```typescript
   * logger.debug('Database query executed', {
   *   query: 'SELECT * FROM users WHERE id = ?',
   *   params: ['123'],
   *   duration: 45
   * });
   * ```
   */
  debug(message: string, context?: Record<string, unknown>): void;

  /**
   * Log an informational message with optional context.
   *
   * Info messages are for general informational events that highlight
   * the progress of the application.
   *
   * @param message - Human-readable log message
   * @param context - Optional structured context object
   *
   * @example
   * ```typescript
   * logger.info('User logged in', {
   *   userId: '123',
   *   ip: '192.168.1.1',
   *   userAgent: 'Mozilla/5.0...'
   * });
   * ```
   */
  info(message: string, context?: Record<string, unknown>): void;

  /**
   * Log a warning message with optional context.
   *
   * Warning messages indicate potentially problematic situations that
   * are not errors but may need attention.
   *
   * @param message - Human-readable log message
   * @param context - Optional structured context object
   *
   * @example
   * ```typescript
   * logger.warn('API rate limit approaching', {
   *   remaining: 10,
   *   limit: 100,
   *   resetAt: '2026-02-08T22:00:00Z'
   * });
   * ```
   */
  warn(message: string, context?: Record<string, unknown>): void;

  /**
   * Log an error message with optional context.
   *
   * Error messages indicate failures and exceptions that need investigation.
   * Always include error details and stack traces in context.
   *
   * @param message - Human-readable log message
   * @param context - Optional structured context object
   *
   * @example
   * ```typescript
   * logger.error('Failed to save settings', {
   *   error: error.message,
   *   stack: error.stack,
   *   userId: '123',
   *   operation: 'update'
   * });
   * ```
   */
  error(message: string, context?: Record<string, unknown>): void;
}
