/**
 * SQLite Agent Run Repository Implementation
 *
 * Implements IAgentRunRepository using SQLite database.
 * Uses prepared statements to prevent SQL injection.
 */

import type Database from 'better-sqlite3';
import { injectable } from 'tsyringe';
import type { IAgentRunRepository } from '../../application/ports/output/agents/agent-run-repository.interface.js';
import type { AgentRun, AgentRunStatus } from '../../domain/generated/output.js';
import {
  toDatabase,
  fromDatabase,
  type AgentRunRow,
} from '../persistence/sqlite/mappers/agent-run.mapper.js';

/** Convert a Date, ISO string, or number to a Unix timestamp (ms). Returns null for invalid input. */
function toTimestamp(value: unknown): number | null {
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const ms = new Date(value).getTime();
    return Number.isNaN(ms) ? null : ms;
  }
  return null;
}

/**
 * SQLite implementation of IAgentRunRepository.
 * Manages AgentRun persistence with CRUD operations.
 */
@injectable()
export class SQLiteAgentRunRepository implements IAgentRunRepository {
  constructor(private readonly db: Database.Database) {}

  async create(agentRun: AgentRun): Promise<void> {
    const row = toDatabase(agentRun);

    const stmt = this.db.prepare(`
      INSERT INTO agent_runs (
        id, agent_type, agent_name, status, prompt, result,
        session_id, thread_id, pid, last_heartbeat,
        started_at, completed_at, error,
        feature_id, repository_path,
        created_at, updated_at,
        approval_gates
      ) VALUES (
        @id, @agent_type, @agent_name, @status, @prompt, @result,
        @session_id, @thread_id, @pid, @last_heartbeat,
        @started_at, @completed_at, @error,
        @feature_id, @repository_path,
        @created_at, @updated_at,
        @approval_gates
      )
    `);

    stmt.run(row);
  }

  async findById(id: string): Promise<AgentRun | null> {
    const stmt = this.db.prepare('SELECT * FROM agent_runs WHERE id = ?');
    const row = stmt.get(id) as AgentRunRow | undefined;

    if (!row) {
      return null;
    }

    return fromDatabase(row);
  }

  async findByThreadId(threadId: string): Promise<AgentRun | null> {
    const stmt = this.db.prepare('SELECT * FROM agent_runs WHERE thread_id = ?');
    const row = stmt.get(threadId) as AgentRunRow | undefined;

    if (!row) {
      return null;
    }

    return fromDatabase(row);
  }

  async updateStatus(
    id: string,
    status: AgentRunStatus,
    updates?: Partial<AgentRun>
  ): Promise<void> {
    const setClauses: string[] = ['status = @status', 'updated_at = @updated_at'];
    const params: Record<string, unknown> = {
      id,
      status,
      updated_at: toTimestamp(updates?.updatedAt) ?? Date.now(),
    };

    if (updates?.result !== undefined) {
      setClauses.push('result = @result');
      params.result = updates.result;
    }

    if (updates?.sessionId !== undefined) {
      setClauses.push('session_id = @session_id');
      params.session_id = updates.sessionId;
    }

    if (updates?.pid !== undefined) {
      setClauses.push('pid = @pid');
      params.pid = updates.pid;
    }

    if (updates?.lastHeartbeat !== undefined) {
      setClauses.push('last_heartbeat = @last_heartbeat');
      params.last_heartbeat = toTimestamp(updates.lastHeartbeat);
    }

    if (updates?.startedAt !== undefined) {
      setClauses.push('started_at = @started_at');
      params.started_at = toTimestamp(updates.startedAt);
    }

    if (updates?.completedAt !== undefined) {
      setClauses.push('completed_at = @completed_at');
      params.completed_at = toTimestamp(updates.completedAt);
    }

    if (updates?.error !== undefined) {
      setClauses.push('error = @error');
      params.error = updates.error;
    }

    if (updates?.approvalGates !== undefined) {
      setClauses.push('approval_gates = @approval_gates');
      params.approval_gates = JSON.stringify(updates.approvalGates);
    }

    const stmt = this.db.prepare(`UPDATE agent_runs SET ${setClauses.join(', ')} WHERE id = @id`);

    stmt.run(params);
  }

  async findRunningByPid(pid: number): Promise<AgentRun[]> {
    const stmt = this.db.prepare('SELECT * FROM agent_runs WHERE pid = ? AND status = ?');
    const rows = stmt.all(pid, 'running') as AgentRunRow[];

    return rows.map(fromDatabase);
  }

  async list(): Promise<AgentRun[]> {
    const stmt = this.db.prepare('SELECT * FROM agent_runs');
    const rows = stmt.all() as AgentRunRow[];

    return rows.map(fromDatabase);
  }

  async delete(id: string): Promise<void> {
    const stmt = this.db.prepare('DELETE FROM agent_runs WHERE id = ?');
    stmt.run(id);
  }
}
