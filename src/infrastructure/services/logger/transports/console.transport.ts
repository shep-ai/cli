/**
 * @module Infrastructure.Services.Logger.Transports.Console
 *
 * Console transport for pino logger.
 *
 * Provides two output modes:
 * - **Development**: Pretty-printed with colors (pino-pretty)
 * - **Production**: JSON to stdout (pino/file)
 *
 * ## Usage
 *
 * ```typescript
 * import { createConsoleTransport } from './console.transport';
 * import { LoggerConfigFactory } from '../logger-config.factory';
 * import pino from 'pino';
 *
 * const config = LoggerConfigFactory.create({ settingsLevel: LogLevel.Info });
 * const transport = createConsoleTransport(config);
 * const logger = pino({ level: config.level }, transport);
 * ```
 */

import type { LoggerConfig } from '../logger-config.factory.js';

/**
 * Pino transport configuration.
 *
 * Used by pino.transport() to configure log output destination.
 */
export interface PinoTransport {
  /**
   * Transport target module name.
   * - 'pino-pretty': Pretty-printed logs with colors
   * - 'pino/file': JSON logs to file descriptor
   */
  target: string;

  /**
   * Transport-specific options.
   * Options vary depending on the transport target.
   */
  options: Record<string, unknown>;
}

/**
 * Creates console transport for pino logger.
 *
 * Chooses transport based on environment and configuration:
 * - Pretty-print (pino-pretty) when config.usePrettyPrint is true
 * - JSON output (pino/file) when config.usePrettyPrint is false
 *
 * @param config - Logger configuration from LoggerConfigFactory
 * @returns Pino transport configuration
 *
 * @example
 * ```typescript
 * // Development mode - pretty logs with colors
 * const devConfig = { usePrettyPrint: true, colorize: true, ... };
 * const devTransport = createConsoleTransport(devConfig);
 * // => { target: 'pino-pretty', options: { colorize: true, ... } }
 *
 * // Production mode - JSON logs
 * const prodConfig = { usePrettyPrint: false, colorize: false, ... };
 * const prodTransport = createConsoleTransport(prodConfig);
 * // => { target: 'pino/file', options: { destination: 1 } }
 * ```
 */
export function createConsoleTransport(config: LoggerConfig): PinoTransport {
  if (config.usePrettyPrint) {
    return createPrettyTransport(config);
  } else {
    return createJsonTransport();
  }
}

/**
 * Creates pretty-printed transport using pino-pretty.
 *
 * Features:
 * - Colorized output (if config.colorize is true)
 * - Human-readable timestamps
 * - Ignores noisy fields (pid, hostname)
 * - Single-line message format
 *
 * @param config - Logger configuration
 * @returns Pino transport for pretty-printed logs
 */
function createPrettyTransport(config: LoggerConfig): PinoTransport {
  return {
    target: 'pino-pretty',
    options: {
      // Enable colors based on TTY and config
      colorize: config.colorize,

      // Human-readable timestamp format
      translateTime: 'SYS:HH:MM:ss.l',

      // Ignore noisy default fields
      ignore: 'pid,hostname',

      // Single-line output
      singleLine: true,

      // Sync output (no buffering)
      sync: true,
    },
  };
}

/**
 * Creates JSON transport using pino/file.
 *
 * Features:
 * - Structured JSON output
 * - Writes to stdout (file descriptor 1)
 * - No buffering (sync writes)
 *
 * @returns Pino transport for JSON logs
 */
function createJsonTransport(): PinoTransport {
  return {
    target: 'pino/file',
    options: {
      // Write to stdout (file descriptor 1)
      destination: 1,

      // Sync output (no buffering)
      sync: true,
    },
  };
}
