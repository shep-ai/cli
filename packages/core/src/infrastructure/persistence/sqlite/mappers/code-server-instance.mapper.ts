/**
 * Code Server Instance Database Mapper
 *
 * Maps between CodeServerInstance domain objects and SQLite database rows.
 *
 * Mapping Rules:
 * - TypeScript objects (camelCase) ↔ SQL columns (snake_case)
 * - Dates stored as ISO 8601 strings
 * - Optional stoppedAt stored as NULL when missing
 * - Timestamps (created_at, updated_at) stored as INTEGER (epoch ms)
 */

import type {
  CodeServerInstance,
  CodeServerInstanceStatus,
} from '../../../../domain/generated/output.js';

/**
 * Database row type matching the code_server_instances table schema.
 */
export interface CodeServerInstanceRow {
  id: string;
  feature_id: string;
  pid: number;
  port: number;
  worktree_path: string;
  status: string;
  started_at: string;
  stopped_at: string | null;
  created_at: number;
  updated_at: number;
}

/**
 * Maps CodeServerInstance domain object to database row.
 *
 * @param instance - CodeServerInstance domain object
 * @returns Database row object with snake_case columns
 */
export function toDatabase(instance: CodeServerInstance): CodeServerInstanceRow {
  return {
    id: instance.id,
    feature_id: instance.featureId,
    pid: instance.pid,
    port: instance.port,
    worktree_path: instance.worktreePath,
    status: instance.status,
    started_at:
      instance.startedAt instanceof Date ? instance.startedAt.toISOString() : instance.startedAt,
    stopped_at: instance.stoppedAt
      ? instance.stoppedAt instanceof Date
        ? instance.stoppedAt.toISOString()
        : instance.stoppedAt
      : null,
    created_at: Date.now(),
    updated_at: Date.now(),
  };
}

/**
 * Maps database row to CodeServerInstance domain object.
 *
 * @param row - Database row with snake_case columns
 * @returns CodeServerInstance domain object with camelCase properties
 */
export function fromDatabase(row: CodeServerInstanceRow): CodeServerInstance {
  return {
    id: row.id,
    featureId: row.feature_id,
    pid: row.pid,
    port: row.port,
    worktreePath: row.worktree_path,
    status: row.status as CodeServerInstanceStatus,
    startedAt: new Date(row.started_at),
    ...(row.stopped_at !== null && { stoppedAt: new Date(row.stopped_at) }),
  };
}
