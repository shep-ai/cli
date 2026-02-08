/**
 * Log Entry Mapper
 *
 * Maps between LogEntry domain model and database row format.
 * Handles JSON serialization/deserialization of context field.
 */

import type { LogEntry } from '../../../../domain/generated/output.js';

/**
 * Database row format for log entries.
 * Matches the logs table schema from migration 003.
 */
export interface LogEntryRow {
  id: string;
  timestamp: number;
  level: string;
  source: string;
  message: string;
  context: string | null;
  stack_trace: string | null;
  created_at: string;
}

/**
 * Convert LogEntry domain model to database row format.
 *
 * @param logEntry - Domain model to convert
 * @returns Database row representation
 */
export function toDatabase(logEntry: LogEntry): LogEntryRow {
  return {
    id: logEntry.id,
    timestamp: logEntry.timestamp,
    level: logEntry.level,
    source: logEntry.source,
    message: logEntry.message,
    context: logEntry.context ? JSON.stringify(logEntry.context) : null,
    stack_trace: logEntry.stackTrace ?? null,
    created_at: logEntry.createdAt,
  };
}

/**
 * Convert database row to LogEntry domain model.
 *
 * @param row - Database row to convert
 * @returns Domain model representation
 */
export function fromDatabase(row: LogEntryRow): LogEntry {
  return {
    id: row.id,
    timestamp: row.timestamp,
    level: row.level,
    source: row.source,
    message: row.message,
    context: row.context ? JSON.parse(row.context) : undefined,
    stackTrace: row.stack_trace,
    createdAt: row.created_at,
  };
}
