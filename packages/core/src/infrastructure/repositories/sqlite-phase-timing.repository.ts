/**
 * SQLite Phase Timing Repository Implementation
 *
 * Implements IPhaseTimingRepository using SQLite database.
 * Uses prepared statements to prevent SQL injection.
 */

import type Database from 'better-sqlite3';
import { injectable } from 'tsyringe';
import type { IPhaseTimingRepository } from '../../application/ports/output/agents/phase-timing-repository.interface.js';
import type { PhaseTiming } from '../../domain/generated/output.js';

/**
 * Database row type matching the phase_timings table schema.
 */
interface PhaseTimingRow {
  id: string;
  agent_run_id: string;
  phase: string;
  started_at: number;
  completed_at: number | null;
  duration_ms: number | null;
  created_at: number;
  updated_at: number;
}

function toDatabase(timing: PhaseTiming): PhaseTimingRow {
  return {
    id: timing.id,
    agent_run_id: timing.agentRunId,
    phase: timing.phase,
    started_at: timing.startedAt instanceof Date ? timing.startedAt.getTime() : timing.startedAt,
    completed_at: timing.completedAt instanceof Date ? timing.completedAt.getTime() : null,
    duration_ms: timing.durationMs != null ? Number(timing.durationMs) : null,
    created_at: timing.createdAt instanceof Date ? timing.createdAt.getTime() : timing.createdAt,
    updated_at: timing.updatedAt instanceof Date ? timing.updatedAt.getTime() : timing.updatedAt,
  };
}

function fromDatabase(row: PhaseTimingRow): PhaseTiming {
  return {
    id: row.id,
    agentRunId: row.agent_run_id,
    phase: row.phase,
    startedAt: new Date(row.started_at),
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    ...(row.completed_at !== null && { completedAt: new Date(row.completed_at) }),
    ...(row.duration_ms !== null && { durationMs: BigInt(row.duration_ms) }),
  };
}

/**
 * SQLite implementation of IPhaseTimingRepository.
 */
@injectable()
export class SQLitePhaseTimingRepository implements IPhaseTimingRepository {
  constructor(private readonly db: Database.Database) {}

  async save(phaseTiming: PhaseTiming): Promise<void> {
    const row = toDatabase(phaseTiming);

    const stmt = this.db.prepare(`
      INSERT INTO phase_timings (
        id, agent_run_id, phase, started_at, completed_at, duration_ms,
        created_at, updated_at
      ) VALUES (
        @id, @agent_run_id, @phase, @started_at, @completed_at, @duration_ms,
        @created_at, @updated_at
      )
    `);

    stmt.run(row);
  }

  async update(
    id: string,
    updates: Partial<Pick<PhaseTiming, 'completedAt' | 'durationMs'>>
  ): Promise<void> {
    const setClauses: string[] = ['updated_at = @updated_at'];
    const params: Record<string, unknown> = {
      id,
      updated_at: Date.now(),
    };

    if (updates.completedAt !== undefined) {
      setClauses.push('completed_at = @completed_at');
      params.completed_at =
        updates.completedAt instanceof Date ? updates.completedAt.getTime() : updates.completedAt;
    }

    if (updates.durationMs !== undefined) {
      setClauses.push('duration_ms = @duration_ms');
      params.duration_ms = updates.durationMs;
    }

    const stmt = this.db.prepare(
      `UPDATE phase_timings SET ${setClauses.join(', ')} WHERE id = @id`
    );

    stmt.run(params);
  }

  async findByRunId(agentRunId: string): Promise<PhaseTiming[]> {
    const stmt = this.db.prepare(
      'SELECT * FROM phase_timings WHERE agent_run_id = ? ORDER BY created_at'
    );
    const rows = stmt.all(agentRunId) as PhaseTimingRow[];

    return rows.map(fromDatabase);
  }

  async findByFeatureId(featureId: string): Promise<PhaseTiming[]> {
    const stmt = this.db.prepare(`
      SELECT pt.* FROM phase_timings pt
      INNER JOIN agent_runs ar ON pt.agent_run_id = ar.id
      WHERE ar.feature_id = ?
      ORDER BY pt.created_at
    `);
    const rows = stmt.all(featureId) as PhaseTimingRow[];

    return rows.map(fromDatabase);
  }
}
