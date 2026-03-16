/**
 * Dev Environment Analysis Repository Integration Tests
 *
 * Tests for the SQLite implementation of IDevEnvAnalysisRepository.
 * Verifies CRUD operations, cache key lookups, and database mapping.
 */

import 'reflect-metadata';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type Database from 'better-sqlite3';
import {
  createInMemoryDatabase,
  tableExists,
  getTableSchema,
} from '../../../helpers/database.helper.js';
import { runSQLiteMigrations } from '@/infrastructure/persistence/sqlite/migrations.js';
import { SQLiteDevEnvAnalysisRepository } from '@/infrastructure/repositories/sqlite-dev-env-analysis.repository.js';
import type { DevEnvironmentAnalysis } from '@/domain/generated/output.js';
import { AnalysisSource } from '@/domain/generated/output.js';

describe('SQLiteDevEnvAnalysisRepository', () => {
  let db: Database.Database;
  let repository: SQLiteDevEnvAnalysisRepository;

  const createTestAnalysis = (
    overrides?: Partial<DevEnvironmentAnalysis>
  ): DevEnvironmentAnalysis => ({
    id: 'analysis-001',
    cacheKey: 'git@github.com:org/repo.git',
    canStart: true,
    commands: [
      { command: 'npm run dev', description: 'Start dev server' },
      {
        command: 'npm run db:migrate',
        description: 'Run migrations',
        workingDirectory: 'packages/db',
      },
    ],
    prerequisites: ['Node.js 18+'],
    ports: [3000],
    environmentVariables: { NODE_ENV: 'development' },
    language: 'TypeScript',
    framework: 'Next.js',
    source: AnalysisSource.Agent,
    createdAt: new Date('2025-06-01T10:00:00Z'),
    updatedAt: new Date('2025-06-01T12:00:00Z'),
    ...overrides,
  });

  beforeEach(async () => {
    db = createInMemoryDatabase();
    await runSQLiteMigrations(db);
    expect(tableExists(db, 'dev_environment_analyses')).toBe(true);
    repository = new SQLiteDevEnvAnalysisRepository(db);
  });

  afterEach(() => {
    db.close();
  });

  describe('migration 040 — table schema', () => {
    it('should create dev_environment_analyses table with correct columns', () => {
      const schema = getTableSchema(db, 'dev_environment_analyses');
      const columnNames = schema.map((c) => c.name);

      expect(columnNames).toContain('id');
      expect(columnNames).toContain('cache_key');
      expect(columnNames).toContain('can_start');
      expect(columnNames).toContain('reason');
      expect(columnNames).toContain('commands');
      expect(columnNames).toContain('prerequisites');
      expect(columnNames).toContain('ports');
      expect(columnNames).toContain('environment_variables');
      expect(columnNames).toContain('language');
      expect(columnNames).toContain('framework');
      expect(columnNames).toContain('source');
      expect(columnNames).toContain('created_at');
      expect(columnNames).toContain('updated_at');
    });

    it('should have NOT NULL constraints on required columns', () => {
      const schema = getTableSchema(db, 'dev_environment_analyses');
      const byName = Object.fromEntries(schema.map((c) => [c.name, c]));

      expect(byName['id'].notnull).toBe(1);
      expect(byName['cache_key'].notnull).toBe(1);
      expect(byName['can_start'].notnull).toBe(1);
      expect(byName['commands'].notnull).toBe(1);
      expect(byName['language'].notnull).toBe(1);
      expect(byName['source'].notnull).toBe(1);
      expect(byName['created_at'].notnull).toBe(1);
      expect(byName['updated_at'].notnull).toBe(1);
    });

    it('should allow NULL on optional columns', () => {
      const schema = getTableSchema(db, 'dev_environment_analyses');
      const byName = Object.fromEntries(schema.map((c) => [c.name, c]));

      expect(byName['reason'].notnull).toBe(0);
      expect(byName['prerequisites'].notnull).toBe(0);
      expect(byName['ports'].notnull).toBe(0);
      expect(byName['environment_variables'].notnull).toBe(0);
      expect(byName['framework'].notnull).toBe(0);
    });

    it('should have id as primary key', () => {
      const schema = getTableSchema(db, 'dev_environment_analyses');
      const idCol = schema.find((c) => c.name === 'id');

      expect(idCol?.pk).toBe(1);
    });

    it('should enforce UNIQUE constraint on cache_key', () => {
      const analysis1 = createTestAnalysis({ id: 'analysis-001' });
      const analysis2 = createTestAnalysis({ id: 'analysis-002' });

      db.prepare(
        `INSERT INTO dev_environment_analyses (id, cache_key, can_start, commands, language, source, created_at, updated_at)
         VALUES (?, ?, 1, '[]', 'TypeScript', 'Agent', 0, 0)`
      ).run(analysis1.id, analysis1.cacheKey);

      expect(() => {
        db.prepare(
          `INSERT INTO dev_environment_analyses (id, cache_key, can_start, commands, language, source, created_at, updated_at)
           VALUES (?, ?, 1, '[]', 'TypeScript', 'Agent', 0, 0)`
        ).run(analysis2.id, analysis2.cacheKey);
      }).toThrow();
    });
  });

  describe('save()', () => {
    it('should persist analysis record with all fields', async () => {
      const analysis = createTestAnalysis();

      await repository.save(analysis);

      const row = db
        .prepare('SELECT * FROM dev_environment_analyses WHERE id = ?')
        .get('analysis-001') as Record<string, unknown>;

      expect(row).toBeDefined();
      expect(row.id).toBe('analysis-001');
      expect(row.cache_key).toBe('git@github.com:org/repo.git');
      expect(row.can_start).toBe(1);
      expect(row.reason).toBeNull();
      expect(row.language).toBe('TypeScript');
      expect(row.framework).toBe('Next.js');
      expect(row.source).toBe('Agent');
      expect(row.created_at).toBe(new Date('2025-06-01T10:00:00Z').getTime());
      expect(row.updated_at).toBe(new Date('2025-06-01T12:00:00Z').getTime());
    });

    it('should store commands as JSON string', async () => {
      const analysis = createTestAnalysis();

      await repository.save(analysis);

      const row = db
        .prepare('SELECT commands FROM dev_environment_analyses WHERE id = ?')
        .get('analysis-001') as Record<string, unknown>;

      const commands = JSON.parse(row.commands as string);
      expect(commands).toHaveLength(2);
      expect(commands[0].command).toBe('npm run dev');
      expect(commands[1].workingDirectory).toBe('packages/db');
    });

    it('should store optional fields as NULL when not provided', async () => {
      const analysis = createTestAnalysis({
        reason: undefined,
        prerequisites: undefined,
        ports: undefined,
        environmentVariables: undefined,
        framework: undefined,
      });

      await repository.save(analysis);

      const row = db
        .prepare('SELECT * FROM dev_environment_analyses WHERE id = ?')
        .get('analysis-001') as Record<string, unknown>;

      expect(row.reason).toBeNull();
      expect(row.prerequisites).toBeNull();
      expect(row.ports).toBeNull();
      expect(row.environment_variables).toBeNull();
      expect(row.framework).toBeNull();
    });

    it('should throw on duplicate cache_key', async () => {
      const analysis1 = createTestAnalysis({ id: 'analysis-001' });
      const analysis2 = createTestAnalysis({ id: 'analysis-002' });

      await repository.save(analysis1);

      await expect(repository.save(analysis2)).rejects.toThrow();
    });
  });

  describe('findByCacheKey()', () => {
    it('should return null when no record exists', async () => {
      const result = await repository.findByCacheKey('nonexistent');

      expect(result).toBeNull();
    });

    it('should return analysis when cache key matches', async () => {
      const analysis = createTestAnalysis();
      await repository.save(analysis);

      const found = await repository.findByCacheKey('git@github.com:org/repo.git');

      expect(found).not.toBeNull();
      expect(found!.id).toBe('analysis-001');
      expect(found!.cacheKey).toBe('git@github.com:org/repo.git');
      expect(found!.canStart).toBe(true);
      expect(found!.language).toBe('TypeScript');
      expect(found!.framework).toBe('Next.js');
      expect(found!.source).toBe(AnalysisSource.Agent);
    });

    it('should correctly reconstruct commands array', async () => {
      const analysis = createTestAnalysis();
      await repository.save(analysis);

      const found = await repository.findByCacheKey('git@github.com:org/repo.git');

      expect(found!.commands).toHaveLength(2);
      expect(found!.commands[0].command).toBe('npm run dev');
      expect(found!.commands[0].description).toBe('Start dev server');
      expect(found!.commands[1].workingDirectory).toBe('packages/db');
    });

    it('should correctly reconstruct Date objects', async () => {
      const analysis = createTestAnalysis();
      await repository.save(analysis);

      const found = await repository.findByCacheKey('git@github.com:org/repo.git');

      expect(found!.createdAt).toBeInstanceOf(Date);
      expect(found!.updatedAt).toBeInstanceOf(Date);
      expect(found!.createdAt).toEqual(new Date('2025-06-01T10:00:00Z'));
      expect(found!.updatedAt).toEqual(new Date('2025-06-01T12:00:00Z'));
    });

    it('should not include optional fields when stored as NULL', async () => {
      const analysis = createTestAnalysis({
        reason: undefined,
        prerequisites: undefined,
        ports: undefined,
        environmentVariables: undefined,
        framework: undefined,
      });
      await repository.save(analysis);

      const found = await repository.findByCacheKey('git@github.com:org/repo.git');

      expect(found!.reason).toBeUndefined();
      expect(found!.prerequisites).toBeUndefined();
      expect(found!.ports).toBeUndefined();
      expect(found!.environmentVariables).toBeUndefined();
      expect(found!.framework).toBeUndefined();
    });
  });

  describe('update()', () => {
    it('should update an existing record by cache key', async () => {
      const analysis = createTestAnalysis();
      await repository.save(analysis);

      const updated = createTestAnalysis({
        canStart: false,
        reason: 'User disabled',
        commands: [],
        source: AnalysisSource.Manual,
        updatedAt: new Date('2025-06-02T10:00:00Z'),
      });
      await repository.update(updated);

      const found = await repository.findByCacheKey('git@github.com:org/repo.git');

      expect(found!.canStart).toBe(false);
      expect(found!.reason).toBe('User disabled');
      expect(found!.commands).toEqual([]);
      expect(found!.source).toBe(AnalysisSource.Manual);
      expect(found!.updatedAt).toEqual(new Date('2025-06-02T10:00:00Z'));
    });

    it('should preserve original id and created_at', async () => {
      const analysis = createTestAnalysis();
      await repository.save(analysis);

      const updated = createTestAnalysis({
        language: 'Python',
        framework: 'Django',
        updatedAt: new Date('2025-06-02T10:00:00Z'),
      });
      await repository.update(updated);

      const found = await repository.findByCacheKey('git@github.com:org/repo.git');

      expect(found!.id).toBe('analysis-001');
      expect(found!.createdAt).toEqual(new Date('2025-06-01T10:00:00Z'));
    });

    it('should update optional fields from null to populated', async () => {
      const analysis = createTestAnalysis({
        prerequisites: undefined,
        ports: undefined,
        environmentVariables: undefined,
      });
      await repository.save(analysis);

      const updated = createTestAnalysis({
        prerequisites: ['Python 3.10+'],
        ports: [8000],
        environmentVariables: { DEBUG: 'true' },
        updatedAt: new Date('2025-06-02T10:00:00Z'),
      });
      await repository.update(updated);

      const found = await repository.findByCacheKey('git@github.com:org/repo.git');

      expect(found!.prerequisites).toEqual(['Python 3.10+']);
      expect(found!.ports).toEqual([8000]);
      expect(found!.environmentVariables).toEqual({ DEBUG: 'true' });
    });
  });

  describe('deleteByCacheKey()', () => {
    it('should delete a record by cache key', async () => {
      const analysis = createTestAnalysis();
      await repository.save(analysis);

      await repository.deleteByCacheKey('git@github.com:org/repo.git');

      const found = await repository.findByCacheKey('git@github.com:org/repo.git');
      expect(found).toBeNull();
    });

    it('should not throw when deleting non-existent cache key', async () => {
      await expect(repository.deleteByCacheKey('nonexistent')).resolves.not.toThrow();
    });

    it('should only delete the matching cache key', async () => {
      const analysis1 = createTestAnalysis({
        id: 'analysis-001',
        cacheKey: 'git@github.com:org/repo-a.git',
      });
      const analysis2 = createTestAnalysis({
        id: 'analysis-002',
        cacheKey: 'git@github.com:org/repo-b.git',
      });
      await repository.save(analysis1);
      await repository.save(analysis2);

      await repository.deleteByCacheKey('git@github.com:org/repo-a.git');

      expect(await repository.findByCacheKey('git@github.com:org/repo-a.git')).toBeNull();
      expect(await repository.findByCacheKey('git@github.com:org/repo-b.git')).not.toBeNull();
    });
  });

  describe('canStart: false scenarios', () => {
    it('should persist and retrieve not-startable analysis', async () => {
      const analysis = createTestAnalysis({
        canStart: false,
        reason: 'This is a utility library with no server or UI component',
        commands: [],
        ports: undefined,
        prerequisites: undefined,
        environmentVariables: undefined,
        framework: undefined,
        source: AnalysisSource.Agent,
      });

      await repository.save(analysis);
      const found = await repository.findByCacheKey('git@github.com:org/repo.git');

      expect(found!.canStart).toBe(false);
      expect(found!.reason).toBe('This is a utility library with no server or UI component');
      expect(found!.commands).toEqual([]);
    });
  });

  describe('different analysis sources', () => {
    it('should persist FastPath source', async () => {
      const analysis = createTestAnalysis({ source: AnalysisSource.FastPath });
      await repository.save(analysis);

      const found = await repository.findByCacheKey('git@github.com:org/repo.git');
      expect(found!.source).toBe(AnalysisSource.FastPath);
    });

    it('should persist Manual source', async () => {
      const analysis = createTestAnalysis({ source: AnalysisSource.Manual });
      await repository.save(analysis);

      const found = await repository.findByCacheKey('git@github.com:org/repo.git');
      expect(found!.source).toBe(AnalysisSource.Manual);
    });
  });
});
