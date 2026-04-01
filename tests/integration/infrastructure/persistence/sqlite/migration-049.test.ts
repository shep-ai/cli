/**
 * Migration 049 Integration Tests
 *
 * Verifies the user_preferred_language column is added to settings
 * with correct defaults and idempotent behavior.
 */

import 'reflect-metadata';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type Database from 'better-sqlite3';
import { createInMemoryDatabase } from '../../../../helpers/database.helper.js';
import { runSQLiteMigrations } from '@/infrastructure/persistence/sqlite/migrations.js';

describe('Migration 049 — user_preferred_language column', () => {
  let db: Database.Database;

  beforeEach(async () => {
    db = createInMemoryDatabase();
    await runSQLiteMigrations(db);
  });

  afterEach(() => {
    db.close();
  });

  it('should add user_preferred_language column to settings table', () => {
    const columns = db.prepare('PRAGMA table_info(settings)').all() as { name: string }[];
    const columnNames = columns.map((c) => c.name);

    expect(columnNames).toContain('user_preferred_language');
  });

  it('should have TEXT type with NOT NULL constraint', () => {
    const columns = db.prepare('PRAGMA table_info(settings)').all() as {
      name: string;
      type: string;
      notnull: number;
    }[];
    const col = columns.find((c) => c.name === 'user_preferred_language');

    expect(col).toBeDefined();
    expect(col!.type).toBe('TEXT');
    expect(col!.notnull).toBe(1);
  });

  it('should default to "en" for new rows', () => {
    db.prepare(
      `INSERT INTO settings (
        id, created_at, updated_at,
        model_analyze, model_requirements, model_plan, model_implement,
        env_default_editor, env_shell_preference,
        sys_auto_update, sys_log_level
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      'test-lang',
      '2026-01-01T00:00:00Z',
      '2026-01-01T00:00:00Z',
      'm1',
      'm2',
      'm3',
      'm4',
      'vscode',
      'bash',
      1,
      'info'
    );

    const row = db
      .prepare('SELECT user_preferred_language FROM settings WHERE id = ?')
      .get('test-lang') as { user_preferred_language: string };
    expect(row.user_preferred_language).toBe('en');
  });

  it('should be idempotent (running migration twice does not throw)', async () => {
    const freshDb = createInMemoryDatabase();
    await runSQLiteMigrations(freshDb);
    // Running migrations again should not throw
    await expect(runSQLiteMigrations(freshDb)).resolves.not.toThrow();
    freshDb.close();
  });

  it('should allow storing non-English language values', () => {
    db.prepare(
      `INSERT INTO settings (
        id, created_at, updated_at,
        model_analyze, model_requirements, model_plan, model_implement,
        env_default_editor, env_shell_preference,
        sys_auto_update, sys_log_level,
        user_preferred_language
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      'test-ar',
      '2026-01-01T00:00:00Z',
      '2026-01-01T00:00:00Z',
      'm1',
      'm2',
      'm3',
      'm4',
      'vscode',
      'bash',
      1,
      'info',
      'ar'
    );

    const row = db
      .prepare('SELECT user_preferred_language FROM settings WHERE id = ?')
      .get('test-ar') as { user_preferred_language: string };
    expect(row.user_preferred_language).toBe('ar');
  });
});
