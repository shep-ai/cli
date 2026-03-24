/**
 * SQLite Interactive Session Repository Implementation
 *
 * Implements IInteractiveSessionRepository using SQLite database.
 * Uses prepared statements to prevent SQL injection.
 */

import type Database from 'better-sqlite3';
import { injectable } from 'tsyringe';
import type { IInteractiveSessionRepository } from '../../application/ports/output/repositories/interactive-session-repository.interface.js';
import type { InteractiveSession } from '../../domain/generated/output.js';
import { InteractiveSessionStatus } from '../../domain/generated/output.js';
import {
  toDatabase,
  fromDatabase,
  type InteractiveSessionRow,
} from '../persistence/sqlite/mappers/interactive-session.mapper.js';

@injectable()
export class SQLiteInteractiveSessionRepository implements IInteractiveSessionRepository {
  constructor(private readonly db: Database.Database) {}

  async create(session: InteractiveSession): Promise<void> {
    const row = toDatabase(session);
    this.db
      .prepare(
        `INSERT INTO interactive_sessions
          (id, feature_id, status, started_at, stopped_at, last_activity_at, created_at, updated_at)
         VALUES
          (@id, @feature_id, @status, @started_at, @stopped_at, @last_activity_at, @created_at, @updated_at)`
      )
      .run(row);
  }

  async findById(id: string): Promise<InteractiveSession | null> {
    const row = this.db.prepare('SELECT * FROM interactive_sessions WHERE id = ?').get(id) as
      | InteractiveSessionRow
      | undefined;
    return row ? fromDatabase(row) : null;
  }

  async findByFeatureId(featureId: string): Promise<InteractiveSession | null> {
    const row = this.db
      .prepare(
        'SELECT * FROM interactive_sessions WHERE feature_id = ? ORDER BY created_at DESC LIMIT 1'
      )
      .get(featureId) as InteractiveSessionRow | undefined;
    return row ? fromDatabase(row) : null;
  }

  async findAllActive(): Promise<InteractiveSession[]> {
    const rows = this.db
      .prepare(`SELECT * FROM interactive_sessions WHERE status IN ('booting','ready')`)
      .all() as InteractiveSessionRow[];
    return rows.map(fromDatabase);
  }

  async updateStatus(
    id: string,
    status: InteractiveSessionStatus,
    stoppedAt?: Date
  ): Promise<void> {
    this.db
      .prepare(
        `UPDATE interactive_sessions
         SET status = @status, stopped_at = @stopped_at, updated_at = @updated_at
         WHERE id = @id`
      )
      .run({
        id,
        status,
        stopped_at: stoppedAt ? stoppedAt.getTime() : null,
        updated_at: Date.now(),
      });
  }

  async updateLastActivity(id: string, lastActivityAt: Date): Promise<void> {
    this.db
      .prepare(
        `UPDATE interactive_sessions
         SET last_activity_at = @last_activity_at, updated_at = @updated_at
         WHERE id = @id`
      )
      .run({ id, last_activity_at: lastActivityAt.getTime(), updated_at: Date.now() });
  }

  async markAllActiveStopped(): Promise<void> {
    this.db
      .prepare(
        `UPDATE interactive_sessions
         SET status = 'stopped', updated_at = ?
         WHERE status IN ('booting','ready')`
      )
      .run(Date.now());
  }

  async countActiveSessions(): Promise<number> {
    const result = this.db
      .prepare(
        `SELECT COUNT(*) as count FROM interactive_sessions WHERE status IN ('booting','ready')`
      )
      .get() as { count: number };
    return result.count;
  }
}
