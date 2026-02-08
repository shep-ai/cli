/**
 * @module Shep.Common.Enums.Logger
 *
 * Defines enums for the logging system in the Shep AI platform.
 * Controls log level filtering and output verbosity.
 */
/**
 * Log Level Hierarchy:
 * ```
 * debug < info < warn < error
 * ```
 *
 * When a log level is set, all messages at that level and higher are shown:
 * - debug: Shows all messages (debug, info, warn, error)
 * - info: Shows info, warn, error (hides debug)
 * - warn: Shows warn, error (hides debug, info)
 * - error: Shows only error messages
 */
@doc("Log levels for controlling logging verbosity")
enum LogLevel {
  /**
   * Debug level - most verbose.
   * Shows all log messages including detailed debugging information.
   * Typically only used in development environments.
   */
  @doc("Verbose debugging information (development only)")
  Debug: "debug",

  /**
   * Info level - general informational messages.
   * Shows progress and general application events.
   * Default level for most environments.
   */
  @doc("General informational messages (default)")
  Info: "info",

  /**
   * Warn level - potentially problematic situations.
   * Shows warnings and errors but hides debug and info messages.
   * Useful for focusing on issues.
   */
  @doc("Warning messages for potentially problematic situations")
  Warn: "warn",

  /**
   * Error level - only errors.
   * Shows only critical error messages.
   * Useful for production monitoring.
   */
  @doc("Error messages for failures and exceptions")
  Error: "error",
}
