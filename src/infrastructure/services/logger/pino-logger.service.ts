/**
 * @module Infrastructure.Services.Logger.PinoLogger
 *
 * Pino-based implementation of ILogger interface.
 *
 * Features:
 * - Structured JSON logging
 * - Multiple transports (console, file)
 * - Automatic log rotation
 * - Sensitive data redaction
 * - High performance (uses worker threads in production)
 *
 * ## Usage
 *
 * ```typescript
 * import { PinoLogger } from './pino-logger.service';
 * import { LogLevel } from '@/domain/generated/output';
 *
 * const logger = new PinoLogger({
 *   level: LogLevel.Info,
 *   logDir: '~/.shep/logs'
 * });
 *
 * logger.info('Application started', { version: '1.0.0' });
 * logger.error('Failed to connect', { error: err.message, stack: err.stack });
 * ```
 */

import pino from 'pino';
import type { ILogger } from '../../../application/ports/output/logger.interface.js';
import { type LogLevel } from '../../../domain/generated/output.js';
import { LoggerConfigFactory } from './logger-config.factory.js';
import { createConsoleTransport } from './transports/console.transport.js';
import { createFileTransport } from './transports/file.transport.js';

/**
 * Configuration options for PinoLogger.
 */
export interface PinoLoggerConfig {
  /**
   * Log level to use.
   * Determines which messages are logged.
   */
  level: LogLevel;

  /**
   * Directory for file logging (optional).
   * If undefined, only console logging is enabled.
   * If provided, logs are written to files with rotation.
   */
  logDir?: string;

  /**
   * Force pretty-print mode (optional).
   * Overrides environment-based detection.
   */
  forcePrettyPrint?: boolean;
}

/**
 * Pino-based logger implementation.
 *
 * Implements ILogger interface using pino for high-performance structured logging.
 *
 * @example
 * ```typescript
 * const logger = new PinoLogger({
 *   level: LogLevel.Info,
 *   logDir: '~/.shep/logs'
 * });
 *
 * logger.info('User logged in', { userId: '123', ip: '192.168.1.1' });
 * logger.error('Database error', { error: err.message, query: sql });
 * ```
 */
export class PinoLogger implements ILogger {
  /**
   * Underlying pino logger instance.
   */
  private readonly logger: pino.Logger;

  /**
   * Creates a new PinoLogger instance.
   *
   * @param config - Logger configuration
   */
  constructor(config: PinoLoggerConfig) {
    // Create logger configuration
    const loggerConfig = LoggerConfigFactory.create({
      settingsLevel: config.level,
      forcePrettyPrint: config.forcePrettyPrint,
    });

    // Determine if we should use transports or simple stream
    const useTransports = config.logDir !== undefined || !loggerConfig.isDevelopment;

    if (useTransports) {
      // Create console transport
      const consoleTransport = createConsoleTransport(loggerConfig);

      // Create transports array
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const transports: any[] = [consoleTransport];

      // Add file transport if log directory provided
      if (config.logDir) {
        const fileTransport = createFileTransport(config.logDir);
        transports.push(fileTransport);
      }

      // Create pino logger with transports
      this.logger = pino(
        {
          level: loggerConfig.level,

          // Redact sensitive fields
          redact: {
            paths: [
              'password',
              'apiKey',
              'api_key',
              'token',
              'accessToken',
              'access_token',
              'secret',
              'authorization',
              'cookie',
            ],
            remove: true,
          },

          // Base metadata
          base: {
            // Include pid and hostname for production debugging
            pid: process.pid,
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            hostname: require('os').hostname(),
          },

          // Timestamp in ISO format
          timestamp: pino.stdTimeFunctions.isoTime,
        },
        // Multiple transports
        transports.length === 1 ? transports[0] : pino.transport({ targets: transports })
      );
    } else {
      // Simple logger for development/testing (no transports)
      this.logger = pino({
        level: loggerConfig.level,

        // Redact sensitive fields
        redact: {
          paths: [
            'password',
            'apiKey',
            'api_key',
            'token',
            'accessToken',
            'access_token',
            'secret',
            'authorization',
            'cookie',
          ],
          remove: true,
        },

        // Timestamp in ISO format
        timestamp: pino.stdTimeFunctions.isoTime,
      });
    }
  }

  /**
   * Logs a debug message with optional context.
   *
   * Debug messages are verbose and typically only shown in development.
   *
   * @param message - Human-readable log message
   * @param context - Optional structured context object
   */
  debug(message: string, context?: Record<string, unknown>): void {
    if (context) {
      this.logger.debug(context, message);
    } else {
      this.logger.debug(message);
    }
  }

  /**
   * Logs an informational message with optional context.
   *
   * Info messages highlight the progress of the application.
   *
   * @param message - Human-readable log message
   * @param context - Optional structured context object
   */
  info(message: string, context?: Record<string, unknown>): void {
    if (context) {
      this.logger.info(context, message);
    } else {
      this.logger.info(message);
    }
  }

  /**
   * Logs a warning message with optional context.
   *
   * Warning messages indicate potentially problematic situations.
   *
   * @param message - Human-readable log message
   * @param context - Optional structured context object
   */
  warn(message: string, context?: Record<string, unknown>): void {
    if (context) {
      this.logger.warn(context, message);
    } else {
      this.logger.warn(message);
    }
  }

  /**
   * Logs an error message with optional context.
   *
   * Error messages indicate failures and exceptions.
   *
   * @param message - Human-readable log message
   * @param context - Optional structured context object
   */
  error(message: string, context?: Record<string, unknown>): void {
    if (context) {
      this.logger.error(context, message);
    } else {
      this.logger.error(message);
    }
  }
}
