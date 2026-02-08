/**
 * @module Infrastructure.Services.Logger.Config
 *
 * Factory for creating logger configuration with multi-layer precedence.
 *
 * ## Configuration Precedence
 *
 * Log level is resolved in this order (highest to lowest):
 * 1. **CLI flags** - Explicit --log-level flag
 * 2. **Environment variables** - LOG_LEVEL env var
 * 3. **Settings database** - Persisted user preference
 * 4. **Default** - info level
 *
 * ## Environment Detection
 *
 * The factory detects the runtime environment (NODE_ENV):
 * - **development/test**: Pretty-printed logs with colors
 * - **production**: JSON logs for machine parsing
 *
 * ## Usage
 *
 * ```typescript
 * import { LoggerConfigFactory } from './logger-config.factory';
 * import { LogLevel } from '@/domain/generated/output';
 *
 * const config = LoggerConfigFactory.create({
 *   cliLevel: LogLevel.Debug,      // From CLI arg
 *   envLevel: LogLevel.Info,        // From process.env.LOG_LEVEL
 *   settingsLevel: LogLevel.Warn,   // From Settings
 * });
 *
 * console.log(config.level);          // 'debug' (CLI wins)
 * console.log(config.usePrettyPrint); // true (development)
 * ```
 */

import { LogLevel } from '../../../domain/generated/output.js';

/**
 * Logger configuration options.
 *
 * All fields are optional - the factory will apply defaults and precedence rules.
 */
export interface LoggerConfigOptions {
  /**
   * Log level from CLI flag (highest precedence).
   * Typically parsed from --log-level argument.
   */
  cliLevel?: LogLevel;

  /**
   * Log level from environment variable.
   * Typically from process.env.LOG_LEVEL.
   */
  envLevel?: LogLevel;

  /**
   * Log level from Settings database (lowest precedence).
   * Persisted user preference.
   */
  settingsLevel?: LogLevel;

  /**
   * Force pretty-print mode regardless of environment.
   * Useful for testing or debugging production logs locally.
   */
  forcePrettyPrint?: boolean;
}

/**
 * Complete logger configuration.
 *
 * Returned by LoggerConfigFactory.create() with all resolved values.
 */
export interface LoggerConfig {
  /**
   * Resolved log level (debug/info/warn/error).
   * Determines which messages are displayed.
   */
  level: string;

  /**
   * Whether running in development environment.
   * Based on NODE_ENV !== 'production'.
   */
  isDevelopment: boolean;

  /**
   * Whether running in production environment.
   * Based on NODE_ENV === 'production'.
   */
  isProduction: boolean;

  /**
   * Whether to use pretty-printed logs.
   * True in development, false in production (unless forced).
   */
  usePrettyPrint: boolean;

  /**
   * Whether stdout is a TTY.
   * Determines if colors and interactive features are available.
   */
  isTTY: boolean;

  /**
   * Whether to colorize log output.
   * Enabled when TTY is available and pretty-print is on.
   */
  colorize: boolean;
}

/**
 * Factory for creating logger configuration.
 *
 * Resolves log level from multiple sources with precedence,
 * detects environment, and determines output format.
 */
export class LoggerConfigFactory {
  /**
   * Default log level when no configuration provided.
   */
  private static readonly DEFAULT_LEVEL = LogLevel.Info;

  /**
   * Creates logger configuration with multi-layer precedence.
   *
   * @param options - Configuration options (all optional)
   * @returns Complete logger configuration
   * @throws Error if invalid log level provided
   *
   * @example
   * ```typescript
   * // Use Settings default
   * const config = LoggerConfigFactory.create({
   *   settingsLevel: LogLevel.Info
   * });
   *
   * // CLI overrides Settings
   * const config = LoggerConfigFactory.create({
   *   cliLevel: LogLevel.Debug,
   *   settingsLevel: LogLevel.Info
   * });
   * ```
   */
  static create(options: LoggerConfigOptions = {}): LoggerConfig {
    // Resolve log level with precedence: CLI > ENV > Settings > Default
    const level = this.resolveLogLevel(options);

    // Detect environment
    const nodeEnv = process.env.NODE_ENV || 'development';
    const isProduction = nodeEnv === 'production';
    const isDevelopment = !isProduction;

    // Determine output format
    const isTTY = process.stdout.isTTY ?? false;
    const usePrettyPrint = options.forcePrettyPrint ?? isDevelopment;
    const colorize = usePrettyPrint && isTTY;

    return {
      level: this.logLevelToString(level),
      isDevelopment,
      isProduction,
      usePrettyPrint,
      isTTY,
      colorize,
    };
  }

  /**
   * Resolves log level from options with precedence.
   *
   * Priority order:
   * 1. cliLevel (highest)
   * 2. envLevel
   * 3. settingsLevel
   * 4. DEFAULT_LEVEL (lowest)
   *
   * @param options - Configuration options
   * @returns Resolved LogLevel enum value
   * @throws Error if invalid log level provided
   */
  private static resolveLogLevel(options: LoggerConfigOptions): LogLevel {
    // Validate input levels if provided
    if (options.cliLevel !== undefined) {
      this.validateLogLevel(options.cliLevel);
      return options.cliLevel;
    }

    if (options.envLevel !== undefined) {
      this.validateLogLevel(options.envLevel);
      return options.envLevel;
    }

    if (options.settingsLevel !== undefined) {
      this.validateLogLevel(options.settingsLevel);
      return options.settingsLevel;
    }

    return this.DEFAULT_LEVEL;
  }

  /**
   * Validates that a value is a valid LogLevel enum.
   *
   * @param level - Value to validate
   * @throws Error if level is not a valid LogLevel
   */
  private static validateLogLevel(level: unknown): void {
    const validLevels = Object.values(LogLevel);

    if (!validLevels.includes(level as LogLevel)) {
      throw new Error(`Invalid log level: ${level}. Must be one of: ${validLevels.join(', ')}`);
    }
  }

  /**
   * Converts LogLevel enum to pino-compatible string.
   *
   * @param level - LogLevel enum value
   * @returns Lowercase string (debug/info/warn/error)
   */
  private static logLevelToString(level: LogLevel): string {
    // LogLevel enum values are already lowercase strings
    return level.toLowerCase();
  }
}
