/**
 * @module Shep.Domain.Entities.LogEntry
 *
 * Defines the LogEntry entity representing a single log message in the Shep
 * logging system. Log entries are stored in SQLite with FTS5 full-text search.
 *
 * ## Properties
 *
 * | Property   | Type      | Required | Description                                |
 * |------------|-----------|----------|--------------------------------------------|
 * | id         | string    | Yes      | Unique identifier for the log entry        |
 * | timestamp  | int64     | Yes      | Unix timestamp in milliseconds             |
 * | level      | string    | Yes      | Log level (debug, info, warn, error)       |
 * | source     | string    | Yes      | Source/origin of the log (e.g., "cli:cmd") |
 * | message    | string    | Yes      | Primary log message                        |
 * | context    | object    | No       | Additional structured context data         |
 * | stackTrace | string    | No       | Stack trace for errors                     |
 * | createdAt  | string    | Yes      | ISO 8601 timestamp when log was created    |
 *
 * ## Example
 *
 * ```json
 * {
 *   "id": "550e8400-e29b-41d4-a716-446655440000",
 *   "timestamp": 1707408000000,
 *   "level": "error",
 *   "source": "use-case:settings",
 *   "message": "Failed to update settings",
 *   "context": {
 *     "userId": "user-123",
 *     "errorCode": "DB_WRITE_FAILED"
 *   },
 *   "stackTrace": "Error: Database write failed\n  at ...",
 *   "createdAt": "2026-02-08T12:00:00Z"
 * }
 * ```
 */
import "../../common/enums/logger.tsp";

/**
 * Log Entry Entity
 *
 * Represents a single log message with metadata. Log entries are persisted
 * to SQLite and indexed for full-text search using FTS5.
 *
 * ## Log Levels
 *
 * - debug: Verbose debugging information (development only)
 * - info: General informational messages (default)
 * - warn: Warning messages for potentially problematic situations
 * - error: Error messages for failures and exceptions
 *
 * ## Source Naming Convention
 *
 * Sources should follow the pattern `layer:component`:
 * - Infrastructure: "repository:settings", "service:agent-validator"
 * - Application: "use-case:settings", "use-case:agent"
 * - Presentation: "cli:settings", "web:logs-api"
 *
 * ## Context Data
 *
 * The context field stores additional structured metadata as JSON.
 * Use this for filtering, debugging, and auditing. Common fields:
 * - userId: User who triggered the action
 * - requestId: Request correlation ID
 * - duration: Operation duration in milliseconds
 * - errorCode: Application-specific error code
 */
@doc("Log entry representing a single log message")
model LogEntry {
  /**
   * Unique identifier for the log entry.
   * Generated using UUID v4.
   */
  @doc("Unique log entry identifier")
  id: string;

  /**
   * Unix timestamp in milliseconds when the log was created.
   * Use for time-based filtering and sorting.
   * Note: JavaScript number (53-bit precision) is sufficient for timestamps
   * through the year 2286 (8,640,000,000,000,000 milliseconds).
   */
  @doc("Unix timestamp in milliseconds")
  timestamp: float64;

  /**
   * Log severity level.
   * One of: debug, info, warn, error
   */
  @doc("Log severity level")
  level: string;

  /**
   * Source or origin of the log message.
   * Format: "layer:component" (e.g., "cli:settings", "use-case:agent")
   */
  @doc("Log source (e.g., cli:settings, use-case:agent)")
  source: string;

  /**
   * Primary log message.
   * Human-readable description of the event. Indexed by FTS5 for search.
   */
  @doc("Log message content")
  message: string;

  /**
   * Additional structured context data as JSON.
   * Used for filtering, debugging, and auditing.
   */
  @doc("Additional structured context (optional)")
  context?: {};

  /**
   * Stack trace for errors.
   * Only populated for error-level logs when an exception was thrown.
   */
  @doc("Stack trace for errors (optional)")
  stackTrace?: string | null;

  /**
   * ISO 8601 timestamp when the log entry was created.
   * Format: "YYYY-MM-DDTHH:mm:ss.sssZ"
   */
  @doc("ISO 8601 creation timestamp")
  createdAt: string;
}

/**
 * Log Search Filters
 *
 * Defines filter criteria for searching and querying log entries.
 * All fields are optional; omitted fields are not used for filtering.
 *
 * ## Usage
 *
 * ```typescript
 * const filters: LogSearchFilters = {
 *   level: 'error',
 *   startTime: Date.now() - 3600000, // Last hour
 *   limit: 100,
 *   offset: 0
 * };
 *
 * const logs = await logRepository.search(filters);
 * ```
 *
 * ## Pagination
 *
 * Use `limit` and `offset` for pagination:
 * - Page 1: limit=50, offset=0
 * - Page 2: limit=50, offset=50
 * - Page 3: limit=50, offset=100
 */
@doc("Filter criteria for searching log entries")
model LogSearchFilters {
  /**
   * Filter by log level.
   * Only logs at this exact level will be returned.
   */
  @doc("Filter by log level (exact match)")
  level?: string;

  /**
   * Filter by log source.
   * Only logs from this source will be returned.
   */
  @doc("Filter by log source (exact match)")
  source?: string;

  /**
   * Start of time range filter (inclusive).
   * Unix timestamp in milliseconds.
   */
  @doc("Start time (inclusive, Unix timestamp in ms)")
  startTime?: float64;

  /**
   * End of time range filter (inclusive).
   * Unix timestamp in milliseconds.
   */
  @doc("End time (inclusive, Unix timestamp in ms)")
  endTime?: float64;

  /**
   * Maximum number of results to return.
   * Default: 50, Max: 1000
   */
  @doc("Maximum number of results (default: 50)")
  limit?: int32;

  /**
   * Number of results to skip for pagination.
   * Use with limit for paging: offset = page * limit
   */
  @doc("Number of results to skip (for pagination)")
  offset?: int32;
}
