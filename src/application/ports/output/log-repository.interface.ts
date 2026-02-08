/**
 * Log Repository Interface
 *
 * Defines the contract for log storage and retrieval operations.
 * Implementations must provide persistence for log entries with support
 * for filtering, searching, and retention policies.
 *
 * ## Responsibilities
 *
 * - Persist log entries to durable storage
 * - Retrieve logs by ID
 * - Search logs with filters (level, source, time range, pagination)
 * - Count logs matching filters
 * - Delete logs older than a specified timestamp (retention policy)
 *
 * ## Implementation Notes
 *
 * - All operations should be async
 * - Implementations should handle SQL injection prevention
 * - Large result sets should support pagination via filters
 * - Delete operations should be efficient (bulk delete, not row-by-row)
 *
 * @see SQLiteLogRepository for the SQLite implementation
 */

import type { LogEntry, LogSearchFilters } from '../../../domain/generated/output.js';

/**
 * Repository interface for log persistence and querying.
 *
 * This is an output port in Clean Architecture, defining the contract
 * that infrastructure implementations must fulfill.
 */
export interface ILogRepository {
  /**
   * Save a log entry to the repository.
   *
   * @param logEntry - The log entry to persist
   * @throws Error if the save operation fails
   *
   * @example
   * ```typescript
   * const logEntry: LogEntry = {
   *   id: uuid(),
   *   timestamp: Date.now(),
   *   level: 'info',
   *   source: 'cli:settings',
   *   message: 'Settings updated',
   *   context: { userId: 'user-123' },
   *   stackTrace: null,
   *   createdAt: new Date().toISOString()
   * };
   *
   * await logRepository.save(logEntry);
   * ```
   */
  save(logEntry: LogEntry): Promise<void>;

  /**
   * Find a log entry by its unique identifier.
   *
   * @param id - The log entry ID to search for
   * @returns The log entry if found, null otherwise
   *
   * @example
   * ```typescript
   * const log = await logRepository.findById('550e8400-e29b-41d4-a716-446655440000');
   * if (log) {
   *   console.log(log.message);
   * }
   * ```
   */
  findById(id: string): Promise<LogEntry | null>;

  /**
   * Search for log entries matching the provided filters.
   *
   * All filter fields are optional. Omitted fields are not used for filtering.
   * Results are ordered by timestamp descending (most recent first).
   *
   * @param filters - Search criteria for filtering logs
   * @returns Array of log entries matching the filters
   *
   * @example
   * ```typescript
   * // Find all error logs from the last hour
   * const errors = await logRepository.search({
   *   level: 'error',
   *   startTime: Date.now() - 3600000,
   *   limit: 100,
   *   offset: 0
   * });
   *
   * // Find all logs from a specific source
   * const cliLogs = await logRepository.search({
   *   source: 'cli:settings',
   *   limit: 50
   * });
   * ```
   */
  search(filters: LogSearchFilters): Promise<LogEntry[]>;

  /**
   * Count log entries matching the provided filters.
   *
   * Useful for pagination calculations and statistics.
   *
   * @param filters - Search criteria for counting logs
   * @returns Number of log entries matching the filters
   *
   * @example
   * ```typescript
   * // Count total error logs
   * const errorCount = await logRepository.count({ level: 'error' });
   *
   * // Count logs in a time range
   * const todayCount = await logRepository.count({
   *   startTime: new Date().setHours(0, 0, 0, 0),
   *   endTime: Date.now()
   * });
   * ```
   */
  count(filters: LogSearchFilters): Promise<number>;

  /**
   * Delete log entries older than the specified timestamp.
   *
   * Used to implement log retention policies. Deletes are performed
   * efficiently using bulk operations.
   *
   * @param timestamp - Unix timestamp in milliseconds; logs older than this are deleted
   * @returns Number of log entries deleted
   *
   * @example
   * ```typescript
   * // Delete logs older than 30 days
   * const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
   * const deletedCount = await logRepository.deleteOlderThan(thirtyDaysAgo);
   * console.log(`Deleted ${deletedCount} old logs`);
   * ```
   */
  deleteOlderThan(timestamp: number): Promise<number>;
}
