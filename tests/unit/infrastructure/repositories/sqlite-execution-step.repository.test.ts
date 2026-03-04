/**
 * SQLite Execution Step Repository Tests
 *
 * TDD Phase: RED → GREEN → REFACTOR
 */

import 'reflect-metadata';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { SQLiteExecutionStepRepository } from '@/infrastructure/repositories/sqlite-execution-step.repository.js';
import { ExecutionStepStatus, ExecutionStepType } from '@/domain/generated/output.js';
import type { ExecutionStep } from '@/domain/generated/output.js';
import { runSQLiteMigrations } from '@/infrastructure/persistence/sqlite/migrations.js';

function createStep(overrides: Partial<ExecutionStep> = {}): ExecutionStep {
  const now = new Date();
  return {
    id: `step-${Math.random().toString(36).slice(2, 8)}`,
    agentRunId: 'run-001',
    name: 'analyze',
    type: ExecutionStepType.phase,
    status: ExecutionStepStatus.running,
    startedAt: now,
    createdAt: now,
    updatedAt: now,
    sequenceNumber: 0,
    ...overrides,
  };
}

describe('SQLiteExecutionStepRepository', () => {
  let db: Database.Database;
  let repo: SQLiteExecutionStepRepository;

  beforeEach(async () => {
    db = new Database(':memory:');
    await runSQLiteMigrations(db);
    repo = new SQLiteExecutionStepRepository(db);

    // Insert a test agent_run for foreign key joins
    db.prepare(
      `
      INSERT INTO agent_runs (id, agent_type, agent_name, status, prompt, thread_id, created_at, updated_at, feature_id)
      VALUES ('run-001', 'claude-code', 'feature', 'running', 'test', 'thread-1', ${Date.now()}, ${Date.now()}, 'feat-001')
    `
    ).run();
    db.prepare(
      `
      INSERT INTO agent_runs (id, agent_type, agent_name, status, prompt, thread_id, created_at, updated_at, feature_id)
      VALUES ('run-002', 'claude-code', 'feature', 'running', 'test', 'thread-2', ${Date.now()}, ${Date.now()}, 'feat-001')
    `
    ).run();
  });

  afterEach(() => {
    db.close();
  });

  describe('save + findByRunId', () => {
    it('should save and retrieve a step', async () => {
      const step = createStep({ id: 'step-1', name: 'analyze', sequenceNumber: 0 });
      await repo.save(step);

      const results = await repo.findByRunId('run-001');
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('step-1');
      expect(results[0].name).toBe('analyze');
      expect(results[0].type).toBe(ExecutionStepType.phase);
      expect(results[0].status).toBe(ExecutionStepStatus.running);
      expect(results[0].sequenceNumber).toBe(0);
    });

    it('should return steps ordered by sequenceNumber', async () => {
      await repo.save(createStep({ id: 's-2', name: 'requirements', sequenceNumber: 1 }));
      await repo.save(createStep({ id: 's-1', name: 'analyze', sequenceNumber: 0 }));
      await repo.save(createStep({ id: 's-3', name: 'plan', sequenceNumber: 2 }));

      const results = await repo.findByRunId('run-001');
      expect(results.map((r) => r.name)).toEqual(['analyze', 'requirements', 'plan']);
    });

    it('should return empty array for unknown run', async () => {
      const results = await repo.findByRunId('unknown');
      expect(results).toEqual([]);
    });
  });

  describe('update', () => {
    it('should update status and completedAt', async () => {
      const step = createStep({ id: 'step-u1' });
      await repo.save(step);

      const now = new Date();
      await repo.update('step-u1', {
        status: ExecutionStepStatus.completed,
        completedAt: now,
        durationMs: BigInt(5000),
        outcome: 'success',
      });

      const results = await repo.findByRunId('run-001');
      expect(results[0].status).toBe(ExecutionStepStatus.completed);
      expect(results[0].completedAt).toBeInstanceOf(Date);
      expect(results[0].durationMs).toBe(BigInt(5000));
      expect(results[0].outcome).toBe('success');
    });

    it('should merge metadata with existing metadata', async () => {
      const step = createStep({
        id: 'step-m1',
        metadata: JSON.stringify({ input: 'hello' }),
      });
      await repo.save(step);

      await repo.update('step-m1', {
        metadata: JSON.stringify({ output: 'world' }),
      });

      const results = await repo.findByRunId('run-001');
      const meta = JSON.parse(results[0].metadata!);
      expect(meta).toEqual({ input: 'hello', output: 'world' });
    });
  });

  describe('findByFeatureId', () => {
    it('should find steps across multiple runs for a feature', async () => {
      await repo.save(createStep({ id: 's-r1', agentRunId: 'run-001', sequenceNumber: 0 }));
      await repo.save(createStep({ id: 's-r2', agentRunId: 'run-002', sequenceNumber: 0 }));

      const results = await repo.findByFeatureId('feat-001');
      expect(results).toHaveLength(2);
    });

    it('should return empty for unknown feature', async () => {
      const results = await repo.findByFeatureId('unknown');
      expect(results).toEqual([]);
    });
  });

  describe('getNextSequenceNumber', () => {
    it('should return 0 for first root step', async () => {
      const seq = await repo.getNextSequenceNumber('run-001', null);
      expect(seq).toBe(0);
    });

    it('should increment for subsequent root steps', async () => {
      await repo.save(createStep({ id: 's-1', sequenceNumber: 0 }));
      await repo.save(createStep({ id: 's-2', sequenceNumber: 1 }));

      const seq = await repo.getNextSequenceNumber('run-001', null);
      expect(seq).toBe(2);
    });

    it('should track sequence independently per parent', async () => {
      await repo.save(createStep({ id: 'root-1', sequenceNumber: 0 }));
      await repo.save(createStep({ id: 'child-1', parentId: 'root-1', sequenceNumber: 0 }));

      const rootSeq = await repo.getNextSequenceNumber('run-001', null);
      const childSeq = await repo.getNextSequenceNumber('run-001', 'root-1');

      expect(rootSeq).toBe(1);
      expect(childSeq).toBe(1);
    });
  });

  describe('metadata JSON round-trip', () => {
    it('should preserve complex metadata through save and retrieve', async () => {
      const metadata = {
        input: 'rejection message text',
        attempt: 3,
        failureLogs: ['line1', 'line2'],
        nested: { key: 'value' },
      };
      const step = createStep({
        id: 'step-meta',
        metadata: JSON.stringify(metadata),
      });
      await repo.save(step);

      const results = await repo.findByRunId('run-001');
      expect(JSON.parse(results[0].metadata!)).toEqual(metadata);
    });
  });

  describe('parentId hierarchy', () => {
    it('should save and retrieve steps with parentId', async () => {
      const parent = createStep({ id: 'parent-1', name: 'merge', sequenceNumber: 0 });
      const child = createStep({
        id: 'child-1',
        name: 'commit',
        parentId: 'parent-1',
        type: ExecutionStepType.subStep,
        sequenceNumber: 0,
      });
      await repo.save(parent);
      await repo.save(child);

      const results = await repo.findByRunId('run-001');
      expect(results).toHaveLength(2);

      const childResult = results.find((r) => r.id === 'child-1');
      expect(childResult!.parentId).toBe('parent-1');
      expect(childResult!.type).toBe(ExecutionStepType.subStep);
    });
  });
});
