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
  waiting_approval_at: number | null;
  approval_wait_ms: number | null;
  prompt: string | null;
  model_id: string | null;
  agent_type: string | null;
  input_tokens: number | null;
  output_tokens: number | null;
  exit_code: string | null;
  error_message: string | null;
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
    waiting_approval_at:
      timing.waitingApprovalAt instanceof Date ? timing.waitingApprovalAt.getTime() : null,
    approval_wait_ms: timing.approvalWaitMs != null ? Number(timing.approvalWaitMs) : null,
    prompt: timing.prompt ?? null,
    model_id: timing.modelId ?? null,
    agent_type: timing.agentType ?? null,
    input_tokens: timing.inputTokens != null ? Number(timing.inputTokens) : null,
    output_tokens: timing.outputTokens != null ? Number(timing.outputTokens) : null,
    exit_code: timing.exitCode ?? null,
    error_message: timing.errorMessage ?? null,
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
    ...(row.waiting_approval_at !== null && {
      waitingApprovalAt: new Date(row.waiting_approval_at),
    }),
    ...(row.approval_wait_ms !== null && { approvalWaitMs: BigInt(row.approval_wait_ms) }),
    ...(row.prompt !== null && { prompt: row.prompt }),
    ...(row.model_id !== null && { modelId: row.model_id }),
    ...(row.agent_type !== null && { agentType: row.agent_type }),
    ...(row.input_tokens !== null && { inputTokens: BigInt(row.input_tokens) }),
    ...(row.output_tokens !== null && { outputTokens: BigInt(row.output_tokens) }),
    ...(row.exit_code !== null && { exitCode: row.exit_code }),
    ...(row.error_message !== null && { errorMessage: row.error_message }),
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
        waiting_approval_at, approval_wait_ms,
        prompt, model_id, agent_type, input_tokens, output_tokens, exit_code, error_message,
        created_at, updated_at
      ) VALUES (
        @id, @agent_run_id, @phase, @started_at, @completed_at, @duration_ms,
        @waiting_approval_at, @approval_wait_ms,
        @prompt, @model_id, @agent_type, @input_tokens, @output_tokens, @exit_code, @error_message,
        @created_at, @updated_at
      )
    `);

    stmt.run(row);
  }

  async update(
    id: string,
    updates: Partial<
      Pick<
        PhaseTiming,
        'completedAt' | 'durationMs' | 'inputTokens' | 'outputTokens' | 'exitCode' | 'errorMessage'
      >
    >
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

    if (updates.inputTokens !== undefined) {
      setClauses.push('input_tokens = @input_tokens');
      params.input_tokens = Number(updates.inputTokens);
    }

    if (updates.outputTokens !== undefined) {
      setClauses.push('output_tokens = @output_tokens');
      params.output_tokens = Number(updates.outputTokens);
    }

    if (updates.exitCode !== undefined) {
      setClauses.push('exit_code = @exit_code');
      params.exit_code = updates.exitCode;
    }

    if (updates.errorMessage !== undefined) {
      setClauses.push('error_message = @error_message');
      params.error_message = updates.errorMessage;
    }

    const stmt = this.db.prepare(
      `UPDATE phase_timings SET ${setClauses.join(', ')} WHERE id = @id`
    );

    stmt.run(params);
  }

  async updateApprovalWait(
    id: string,
    updates: Partial<Pick<PhaseTiming, 'waitingApprovalAt' | 'approvalWaitMs'>>
  ): Promise<void> {
    const setClauses: string[] = ['updated_at = @updated_at'];
    const params: Record<string, unknown> = {
      id,
      updated_at: Date.now(),
    };

    if (updates.waitingApprovalAt !== undefined) {
      setClauses.push('waiting_approval_at = @waiting_approval_at');
      params.waiting_approval_at =
        updates.waitingApprovalAt instanceof Date
          ? updates.waitingApprovalAt.getTime()
          : updates.waitingApprovalAt;
    }

    if (updates.approvalWaitMs !== undefined) {
      setClauses.push('approval_wait_ms = @approval_wait_ms');
      params.approval_wait_ms = Number(updates.approvalWaitMs);
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
