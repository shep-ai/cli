/**
 * SQLite Execution Step Repository Implementation
 *
 * Implements IExecutionStepRepository using SQLite database.
 * Stores hierarchical execution steps with metadata JSON support.
 */

import type Database from 'better-sqlite3';
import { injectable } from 'tsyringe';
import type { IExecutionStepRepository } from '../../application/ports/output/agents/execution-step-repository.interface.js';
import type { ExecutionStep, ExecutionStepStatus } from '../../domain/generated/output.js';

/**
 * Database row type matching the execution_steps table schema.
 */
interface ExecutionStepRow {
  id: string;
  agent_run_id: string;
  parent_id: string | null;
  name: string;
  type: string;
  status: string;
  started_at: number;
  completed_at: number | null;
  duration_ms: number | null;
  outcome: string | null;
  metadata: string | null;
  sequence_number: number;
  created_at: number;
  updated_at: number;
}

function toDatabase(step: ExecutionStep): ExecutionStepRow {
  return {
    id: step.id,
    agent_run_id: step.agentRunId,
    parent_id: step.parentId ?? null,
    name: step.name,
    type: step.type,
    status: step.status,
    started_at: step.startedAt instanceof Date ? step.startedAt.getTime() : step.startedAt,
    completed_at: step.completedAt instanceof Date ? step.completedAt.getTime() : null,
    duration_ms: step.durationMs != null ? Number(step.durationMs) : null,
    outcome: step.outcome ?? null,
    metadata: step.metadata ?? null,
    sequence_number: step.sequenceNumber,
    created_at: step.createdAt instanceof Date ? step.createdAt.getTime() : step.createdAt,
    updated_at: step.updatedAt instanceof Date ? step.updatedAt.getTime() : step.updatedAt,
  };
}

function fromDatabase(row: ExecutionStepRow): ExecutionStep {
  return {
    id: row.id,
    agentRunId: row.agent_run_id,
    name: row.name,
    type: row.type as ExecutionStep['type'],
    status: row.status as ExecutionStep['status'],
    startedAt: new Date(row.started_at),
    sequenceNumber: row.sequence_number,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    ...(row.parent_id !== null && { parentId: row.parent_id }),
    ...(row.completed_at !== null && { completedAt: new Date(row.completed_at) }),
    ...(row.duration_ms !== null && { durationMs: BigInt(row.duration_ms) }),
    ...(row.outcome !== null && { outcome: row.outcome }),
    ...(row.metadata !== null && { metadata: row.metadata }),
  };
}

/**
 * SQLite implementation of IExecutionStepRepository.
 */
@injectable()
export class SQLiteExecutionStepRepository implements IExecutionStepRepository {
  constructor(private readonly db: Database.Database) {}

  async save(step: ExecutionStep): Promise<void> {
    const row = toDatabase(step);

    const stmt = this.db.prepare(`
      INSERT INTO execution_steps (
        id, agent_run_id, parent_id, name, type, status,
        started_at, completed_at, duration_ms, outcome, metadata,
        sequence_number, created_at, updated_at
      ) VALUES (
        @id, @agent_run_id, @parent_id, @name, @type, @status,
        @started_at, @completed_at, @duration_ms, @outcome, @metadata,
        @sequence_number, @created_at, @updated_at
      )
    `);

    stmt.run(row);
  }

  async update(
    id: string,
    updates: Partial<
      Pick<ExecutionStep, 'status' | 'completedAt' | 'durationMs' | 'outcome' | 'metadata'>
    > & { status?: ExecutionStepStatus }
  ): Promise<void> {
    const setClauses: string[] = ['updated_at = @updated_at'];
    const params: Record<string, unknown> = {
      id,
      updated_at: Date.now(),
    };

    if (updates.status !== undefined) {
      setClauses.push('status = @status');
      params.status = updates.status;
    }

    if (updates.completedAt !== undefined) {
      setClauses.push('completed_at = @completed_at');
      params.completed_at =
        updates.completedAt instanceof Date ? updates.completedAt.getTime() : updates.completedAt;
    }

    if (updates.durationMs !== undefined) {
      setClauses.push('duration_ms = @duration_ms');
      params.duration_ms = Number(updates.durationMs);
    }

    if (updates.outcome !== undefined) {
      setClauses.push('outcome = @outcome');
      params.outcome = updates.outcome;
    }

    if (updates.metadata !== undefined) {
      // Merge metadata with existing
      setClauses.push(
        `metadata = CASE
          WHEN metadata IS NOT NULL THEN json_patch(metadata, @metadata)
          ELSE @metadata
        END`
      );
      params.metadata = updates.metadata;
    }

    const stmt = this.db.prepare(
      `UPDATE execution_steps SET ${setClauses.join(', ')} WHERE id = @id`
    );

    stmt.run(params);
  }

  async findByRunId(agentRunId: string): Promise<ExecutionStep[]> {
    const stmt = this.db.prepare(
      'SELECT * FROM execution_steps WHERE agent_run_id = ? ORDER BY sequence_number, created_at'
    );
    const rows = stmt.all(agentRunId) as ExecutionStepRow[];

    return rows.map(fromDatabase);
  }

  async findByFeatureId(featureId: string): Promise<ExecutionStep[]> {
    const stmt = this.db.prepare(`
      SELECT es.* FROM execution_steps es
      INNER JOIN agent_runs ar ON es.agent_run_id = ar.id
      WHERE ar.feature_id = ?
      ORDER BY ar.created_at, es.sequence_number, es.created_at
    `);
    const rows = stmt.all(featureId) as ExecutionStepRow[];

    return rows.map(fromDatabase);
  }

  async getNextSequenceNumber(agentRunId: string, parentId: string | null): Promise<number> {
    const stmt = parentId
      ? this.db.prepare(
          'SELECT COALESCE(MAX(sequence_number), -1) + 1 AS next_seq FROM execution_steps WHERE agent_run_id = ? AND parent_id = ?'
        )
      : this.db.prepare(
          'SELECT COALESCE(MAX(sequence_number), -1) + 1 AS next_seq FROM execution_steps WHERE agent_run_id = ? AND parent_id IS NULL'
        );

    const row = (parentId ? stmt.get(agentRunId, parentId) : stmt.get(agentRunId)) as {
      next_seq: number;
    };

    return row.next_seq;
  }
}
