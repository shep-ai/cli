/**
 * Phase Timing Repository Integration Tests
 *
 * Tests for the SQLite implementation of IPhaseTimingRepository.
 * Verifies save, update, and query operations for phase timing records.
 *
 * TDD Phase: RED
 * - Tests written BEFORE implementation
 */

import 'reflect-metadata';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type Database from 'better-sqlite3';
import { createInMemoryDatabase, tableExists } from '../../../helpers/database.helper.js';
import { runSQLiteMigrations } from '../../../../src/infrastructure/persistence/sqlite/migrations.js';
import { SQLitePhaseTimingRepository } from '../../../../src/infrastructure/repositories/sqlite-phase-timing.repository.js';
import type { PhaseTiming } from '../../../../src/domain/generated/output.js';

describe('SQLitePhaseTimingRepository', () => {
  let db: Database.Database;
  let repository: SQLitePhaseTimingRepository;

  const createTestPhaseTiming = (overrides?: Partial<PhaseTiming>): PhaseTiming => ({
    id: 'timing-001',
    agentRunId: 'run-001',
    phase: 'requirements',
    startedAt: new Date('2025-01-01T00:00:00Z'),
    createdAt: new Date('2025-01-01T00:00:00Z'),
    updatedAt: new Date('2025-01-01T00:00:00Z'),
    ...overrides,
  });

  beforeEach(async () => {
    db = createInMemoryDatabase();
    await runSQLiteMigrations(db);
    expect(tableExists(db, 'phase_timings')).toBe(true);
    repository = new SQLitePhaseTimingRepository(db);
  });

  afterEach(() => {
    db.close();
  });

  describe('save()', () => {
    it('should save a phase timing record', async () => {
      const timing = createTestPhaseTiming();

      await repository.save(timing);

      const row = db
        .prepare('SELECT * FROM phase_timings WHERE id = ?')
        .get('timing-001') as Record<string, unknown>;
      expect(row).toBeDefined();
      expect(row.id).toBe('timing-001');
      expect(row.agent_run_id).toBe('run-001');
      expect(row.phase).toBe('requirements');
      expect(row.started_at).toBe(new Date('2025-01-01T00:00:00Z').getTime());
      expect(row.completed_at).toBeNull();
      expect(row.duration_ms).toBeNull();
    });

    it('should save timing with completedAt and durationMs', async () => {
      const timing = createTestPhaseTiming({
        completedAt: new Date('2025-01-01T00:01:00Z'),
        durationMs: BigInt(60000),
      });

      await repository.save(timing);

      const row = db
        .prepare('SELECT * FROM phase_timings WHERE id = ?')
        .get('timing-001') as Record<string, unknown>;
      expect(row.completed_at).toBe(new Date('2025-01-01T00:01:00Z').getTime());
      expect(row.duration_ms).toBe(60000);
    });

    it('should store timestamps as unix milliseconds', async () => {
      const timing = createTestPhaseTiming();

      await repository.save(timing);

      const row = db
        .prepare('SELECT * FROM phase_timings WHERE id = ?')
        .get('timing-001') as Record<string, unknown>;
      expect(row.created_at).toBe(new Date('2025-01-01T00:00:00Z').getTime());
      expect(row.updated_at).toBe(new Date('2025-01-01T00:00:00Z').getTime());
    });
  });

  describe('update()', () => {
    it('should update completedAt and durationMs', async () => {
      const timing = createTestPhaseTiming();
      await repository.save(timing);

      await repository.update('timing-001', {
        completedAt: new Date('2025-01-01T00:01:00Z'),
        durationMs: BigInt(60000),
      });

      const row = db
        .prepare('SELECT * FROM phase_timings WHERE id = ?')
        .get('timing-001') as Record<string, unknown>;
      expect(row.completed_at).toBe(new Date('2025-01-01T00:01:00Z').getTime());
      expect(row.duration_ms).toBe(60000);
    });

    it('should update only completedAt when durationMs is not provided', async () => {
      const timing = createTestPhaseTiming();
      await repository.save(timing);

      await repository.update('timing-001', {
        completedAt: new Date('2025-01-01T00:01:00Z'),
      });

      const row = db
        .prepare('SELECT * FROM phase_timings WHERE id = ?')
        .get('timing-001') as Record<string, unknown>;
      expect(row.completed_at).toBe(new Date('2025-01-01T00:01:00Z').getTime());
      expect(row.duration_ms).toBeNull();
    });
  });

  describe('findByRunId()', () => {
    it('should find all timings for an agent run', async () => {
      await repository.save(
        createTestPhaseTiming({ id: 'timing-001', phase: 'analyze', agentRunId: 'run-001' })
      );
      await repository.save(
        createTestPhaseTiming({ id: 'timing-002', phase: 'requirements', agentRunId: 'run-001' })
      );
      await repository.save(
        createTestPhaseTiming({ id: 'timing-003', phase: 'analyze', agentRunId: 'run-002' })
      );

      const timings = await repository.findByRunId('run-001');

      expect(timings).toHaveLength(2);
      expect(timings.map((t) => t.id)).toContain('timing-001');
      expect(timings.map((t) => t.id)).toContain('timing-002');
    });

    it('should return empty array when no timings exist for run', async () => {
      const timings = await repository.findByRunId('non-existent-run');

      expect(timings).toEqual([]);
    });

    it('should correctly map timestamps back to Date objects', async () => {
      await repository.save(
        createTestPhaseTiming({
          completedAt: new Date('2025-01-01T00:01:00Z'),
          durationMs: BigInt(60000),
        })
      );

      const timings = await repository.findByRunId('run-001');

      expect(timings).toHaveLength(1);
      const timing = timings[0];
      expect(timing.startedAt).toBeInstanceOf(Date);
      expect(timing.createdAt).toBeInstanceOf(Date);
      expect(timing.updatedAt).toBeInstanceOf(Date);
      expect(timing.completedAt).toBeInstanceOf(Date);
      expect((timing.startedAt as Date).toISOString()).toBe('2025-01-01T00:00:00.000Z');
      expect((timing.completedAt as Date).toISOString()).toBe('2025-01-01T00:01:00.000Z');
      expect(timing.durationMs).toBe(BigInt(60000));
    });

    it('should not include optional fields when they are NULL', async () => {
      await repository.save(createTestPhaseTiming());

      const timings = await repository.findByRunId('run-001');

      expect(timings).toHaveLength(1);
      expect(timings[0].completedAt).toBeUndefined();
      expect(timings[0].durationMs).toBeUndefined();
    });
  });

  describe('findByFeatureId()', () => {
    it('should find timings via agent_runs join', async () => {
      // Create an agent run with feature reference
      db.prepare(
        `
        INSERT INTO agent_runs (
          id, agent_type, agent_name, status, prompt, thread_id,
          feature_id, created_at, updated_at
        ) VALUES (
          'run-001', 'claude-code', 'feature-agent', 'running', 'test', 'thread-001',
          'feat-001', ${Date.now()}, ${Date.now()}
        )
      `
      ).run();

      await repository.save(
        createTestPhaseTiming({ id: 'timing-001', agentRunId: 'run-001', phase: 'analyze' })
      );
      await repository.save(
        createTestPhaseTiming({ id: 'timing-002', agentRunId: 'run-001', phase: 'requirements' })
      );

      const timings = await repository.findByFeatureId('feat-001');

      expect(timings).toHaveLength(2);
    });

    it('should return empty array when no timings exist for feature', async () => {
      const timings = await repository.findByFeatureId('non-existent-feat');

      expect(timings).toEqual([]);
    });
  });
});
