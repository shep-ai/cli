/**
 * Interactive Session Database Mapper
 *
 * Maps between InteractiveSession domain objects and SQLite database rows.
 *
 * Mapping Rules:
 * - TypeScript objects (camelCase) <-> SQL columns (snake_case)
 * - Dates stored as INTEGER (unix milliseconds)
 * - Optional stoppedAt stored as NULL when absent
 * - InteractiveSessionStatus stored as string enum values
 */

import type { InteractiveSession } from '../../../../domain/generated/output.js';
import { type InteractiveSessionStatus } from '../../../../domain/generated/output.js';

/**
 * Database row type matching the interactive_sessions table schema.
 * Uses snake_case column names.
 */
export interface InteractiveSessionRow {
  id: string;
  feature_id: string;
  status: string;
  agent_session_id: string | null;
  turn_status: string;
  started_at: number;
  stopped_at: number | null;
  last_activity_at: number;
  created_at: number;
  updated_at: number;
}

/**
 * Maps InteractiveSession domain object to database row.
 * Converts Date objects to unix milliseconds for SQL storage.
 */
export function toDatabase(session: InteractiveSession): InteractiveSessionRow {
  return {
    id: session.id,
    feature_id: session.featureId,
    status: session.status,
    agent_session_id: null,
    turn_status: 'idle',
    started_at: session.startedAt instanceof Date ? session.startedAt.getTime() : session.startedAt,
    stopped_at:
      session.stoppedAt instanceof Date ? session.stoppedAt.getTime() : (session.stoppedAt ?? null),
    last_activity_at:
      session.lastActivityAt instanceof Date
        ? session.lastActivityAt.getTime()
        : session.lastActivityAt,
    created_at: session.createdAt instanceof Date ? session.createdAt.getTime() : session.createdAt,
    updated_at: session.updatedAt instanceof Date ? session.updatedAt.getTime() : session.updatedAt,
  };
}

/**
 * Maps database row to InteractiveSession domain object.
 * Converts unix milliseconds back to Date objects.
 */
export function fromDatabase(row: InteractiveSessionRow): InteractiveSession {
  return {
    id: row.id,
    featureId: row.feature_id,
    status: row.status as InteractiveSessionStatus,
    startedAt: new Date(row.started_at),
    lastActivityAt: new Date(row.last_activity_at),
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    ...(row.stopped_at !== null && { stoppedAt: new Date(row.stopped_at) }),
  };
}
