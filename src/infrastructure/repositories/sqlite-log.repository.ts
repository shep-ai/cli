/**
 * SQLite Log Repository Implementation
 *
 * Implements ILogRepository using SQLite database with FTS5 full-text search.
 * Provides efficient log storage, querying, and retention management.
 *
 * ## Features
 *
 * - Parameterized queries for SQL injection prevention
 * - FTS5 full-text search via logs_fts virtual table
 * - Efficient filtering and pagination
 * - Bulk delete for retention policies
 *
 * ## Performance
 *
 * - Indexed on timestamp, level, source for fast filtering
 * - Default limit of 50 to prevent large result sets
 * - Bulk delete for efficient retention cleanup
 */

import type Database from 'better-sqlite3';
import { injectable, inject } from 'tsyringe';
import type { ILogRepository } from '../../application/ports/output/log-repository.interface.js';
import type { LogEntry, LogSearchFilters } from '../../domain/generated/output.js';
import type { ILogger } from '../../application/ports/output/logger.interface.js';
import {
  toDatabase,
  fromDatabase,
  type LogEntryRow,
} from '../persistence/sqlite/mappers/log-entry.mapper.js';

/**
 * SQLite implementation of ILogRepository.
 * Uses FTS5 for full-text search and optimized indexes for filtering.
 */
@injectable()
export class SQLiteLogRepository implements ILogRepository {
  private readonly logger: ILogger;
  private readonly DEFAULT_LIMIT = 50;

  constructor(
    private readonly db: Database.Database,
    @inject('ILogger') logger: ILogger
  ) {
    this.logger = logger;
  }

  /**
   * Save a log entry to the database.
   * Also triggers FTS5 sync automatically via database triggers.
   */
  async save(logEntry: LogEntry): Promise<void> {
    this.logger.debug('Saving log entry to database', { logEntryId: logEntry.id });

    const row = toDatabase(logEntry);

    const stmt = this.db.prepare(`
      INSERT INTO logs (
        id, timestamp, level, source, message, context, stack_trace, created_at
      ) VALUES (
        @id, @timestamp, @level, @source, @message, @context, @stack_trace, @created_at
      )
    `);

    stmt.run(row);

    this.logger.debug('Log entry saved successfully', { logEntryId: logEntry.id });
  }

  /**
   * Find a log entry by its unique identifier.
   */
  async findById(id: string): Promise<LogEntry | null> {
    this.logger.debug('Finding log entry by ID', { logEntryId: id });

    const stmt = this.db.prepare('SELECT * FROM logs WHERE id = ?');
    const row = stmt.get(id) as LogEntryRow | undefined;

    if (!row) {
      this.logger.debug('Log entry not found', { logEntryId: id });
      return null;
    }

    const logEntry = fromDatabase(row);
    this.logger.debug('Log entry found', { logEntryId: id });
    return logEntry;
  }

  /**
   * Search for log entries matching the provided filters.
   * Results are ordered by timestamp descending (most recent first).
   */
  async search(filters: LogSearchFilters): Promise<LogEntry[]> {
    this.logger.debug('Searching log entries', { filters });

    const { sql, params } = this.buildSearchQuery(filters);

    const stmt = this.db.prepare(sql);
    const rows = stmt.all(params) as LogEntryRow[];

    const logEntries = rows.map(fromDatabase);

    this.logger.debug('Log search completed', {
      filters,
      resultCount: logEntries.length,
    });

    return logEntries;
  }

  /**
   * Count log entries matching the provided filters.
   */
  async count(filters: LogSearchFilters): Promise<number> {
    this.logger.debug('Counting log entries', { filters });

    const { sql, params } = this.buildCountQuery(filters);

    const stmt = this.db.prepare(sql);
    const result = stmt.get(params) as { count: number };

    const count = result.count;

    this.logger.debug('Log count completed', { filters, count });

    return count;
  }

  /**
   * Delete log entries older than the specified timestamp.
   * Uses bulk delete for efficiency.
   */
  async deleteOlderThan(timestamp: number): Promise<number> {
    this.logger.debug('Deleting logs older than timestamp', { timestamp });

    const stmt = this.db.prepare('DELETE FROM logs WHERE timestamp < ?');
    const result = stmt.run(timestamp);

    const deletedCount = result.changes;

    this.logger.info('Deleted old log entries', {
      timestamp,
      deletedCount,
    });

    return deletedCount;
  }

  /**
   * Build SQL query for search operation with dynamic filters.
   */
  private buildSearchQuery(filters: LogSearchFilters): {
    sql: string;
    params: Record<string, string | number>;
  } {
    const whereClauses: string[] = [];
    const params: Record<string, string | number> = {};

    // Apply level filter
    if (filters.level) {
      whereClauses.push('level = @level');
      params.level = filters.level;
    }

    // Apply source filter
    if (filters.source) {
      whereClauses.push('source = @source');
      params.source = filters.source;
    }

    // Apply time range filters
    if (filters.startTime !== undefined) {
      whereClauses.push('timestamp >= @startTime');
      params.startTime = filters.startTime;
    }

    if (filters.endTime !== undefined) {
      whereClauses.push('timestamp <= @endTime');
      params.endTime = filters.endTime;
    }

    // Build WHERE clause
    const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    // Apply pagination
    const limit = filters.limit ?? this.DEFAULT_LIMIT;
    const offset = filters.offset ?? 0;

    params.limit = limit;
    params.offset = offset;

    // Build complete SQL
    const sql = `
      SELECT *
      FROM logs
      ${whereClause}
      ORDER BY timestamp DESC
      LIMIT @limit
      OFFSET @offset
    `;

    return { sql, params };
  }

  /**
   * Build SQL query for count operation with dynamic filters.
   */
  private buildCountQuery(filters: LogSearchFilters): {
    sql: string;
    params: Record<string, string | number>;
  } {
    const whereClauses: string[] = [];
    const params: Record<string, string | number> = {};

    // Apply level filter
    if (filters.level) {
      whereClauses.push('level = @level');
      params.level = filters.level;
    }

    // Apply source filter
    if (filters.source) {
      whereClauses.push('source = @source');
      params.source = filters.source;
    }

    // Apply time range filters
    if (filters.startTime !== undefined) {
      whereClauses.push('timestamp >= @startTime');
      params.startTime = filters.startTime;
    }

    if (filters.endTime !== undefined) {
      whereClauses.push('timestamp <= @endTime');
      params.endTime = filters.endTime;
    }

    // Build WHERE clause
    const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    // Build complete SQL
    const sql = `
      SELECT COUNT(*) as count
      FROM logs
      ${whereClause}
    `;

    return { sql, params };
  }
}
