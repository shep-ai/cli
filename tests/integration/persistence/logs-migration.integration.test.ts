/**
 * Integration test for logs table migration
 *
 * Tests the creation of logs table, FTS5 virtual table, triggers, and indexes.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { runSQLiteMigrations } from '../../../src/infrastructure/persistence/sqlite/migrations.js';

describe('Logs Migration (003)', () => {
  let db: Database.Database;

  beforeEach(() => {
    // Create an in-memory database for testing
    db = new Database(':memory:');
  });

  afterEach(() => {
    db.close();
  });

  it('should create logs table with correct schema', async () => {
    await runSQLiteMigrations(db);

    // Query table structure
    const tableInfo = db.pragma('table_info(logs)') as {
      name: string;
      type: string;
      notnull: number;
    }[];

    const columnNames = tableInfo.map((col) => col.name);

    expect(columnNames).toContain('id');
    expect(columnNames).toContain('timestamp');
    expect(columnNames).toContain('level');
    expect(columnNames).toContain('source');
    expect(columnNames).toContain('message');
    expect(columnNames).toContain('context');
    expect(columnNames).toContain('stack_trace');
    expect(columnNames).toContain('created_at');
  });

  it('should create logs_fts FTS5 virtual table', async () => {
    await runSQLiteMigrations(db);

    // Check FTS5 table exists
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='logs_fts'")
      .all() as { name: string }[];

    expect(tables).toHaveLength(1);
    expect(tables[0].name).toBe('logs_fts');
  });

  it('should create index on timestamp column', async () => {
    await runSQLiteMigrations(db);

    // Query indexes
    const indexes = db
      .prepare("SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='logs'")
      .all() as { name: string }[];

    const indexNames = indexes.map((idx) => idx.name);

    expect(indexNames).toContain('idx_logs_timestamp');
  });

  it('should create index on level column', async () => {
    await runSQLiteMigrations(db);

    const indexes = db
      .prepare("SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='logs'")
      .all() as { name: string }[];

    const indexNames = indexes.map((idx) => idx.name);

    expect(indexNames).toContain('idx_logs_level');
  });

  it('should create index on source column', async () => {
    await runSQLiteMigrations(db);

    const indexes = db
      .prepare("SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='logs'")
      .all() as { name: string }[];

    const indexNames = indexes.map((idx) => idx.name);

    expect(indexNames).toContain('idx_logs_source');
  });

  it('should sync logs to FTS5 table on insert', async () => {
    await runSQLiteMigrations(db);

    // Insert a log entry
    const insertStmt = db.prepare(`
      INSERT INTO logs (id, timestamp, level, source, message, context, stack_trace, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertStmt.run(
      '550e8400-e29b-41d4-a716-446655440000',
      1707408000000,
      'info',
      'test-source',
      'Test log message',
      '{}',
      null,
      '2026-02-08T12:00:00Z'
    );

    // Query FTS5 table
    const ftsRows = db.prepare('SELECT * FROM logs_fts WHERE message MATCH ?').all('Test');

    expect(ftsRows).toHaveLength(1);
  });

  it('should update FTS5 table on update', async () => {
    await runSQLiteMigrations(db);

    // Insert a log entry
    const insertStmt = db.prepare(`
      INSERT INTO logs (id, timestamp, level, source, message, context, stack_trace, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertStmt.run(
      '550e8400-e29b-41d4-a716-446655440000',
      1707408000000,
      'info',
      'test-source',
      'Original message',
      '{}',
      null,
      '2026-02-08T12:00:00Z'
    );

    // Update the message
    const updateStmt = db.prepare('UPDATE logs SET message = ? WHERE id = ?');
    updateStmt.run('Updated message', '550e8400-e29b-41d4-a716-446655440000');

    // Query FTS5 for new message
    const ftsRows = db.prepare('SELECT * FROM logs_fts WHERE message MATCH ?').all('Updated');

    expect(ftsRows).toHaveLength(1);
  });

  it('should delete from FTS5 table on delete', async () => {
    await runSQLiteMigrations(db);

    // Insert a log entry
    const insertStmt = db.prepare(`
      INSERT INTO logs (id, timestamp, level, source, message, context, stack_trace, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertStmt.run(
      '550e8400-e29b-41d4-a716-446655440000',
      1707408000000,
      'info',
      'test-source',
      'Test message',
      '{}',
      null,
      '2026-02-08T12:00:00Z'
    );

    // Delete the log entry
    const deleteStmt = db.prepare('DELETE FROM logs WHERE id = ?');
    deleteStmt.run('550e8400-e29b-41d4-a716-446655440000');

    // Query FTS5 table (should be empty)
    const ftsRows = db.prepare('SELECT * FROM logs_fts WHERE message MATCH ?').all('Test');

    expect(ftsRows).toHaveLength(0);
  });

  it('should set migration version to 4', async () => {
    await runSQLiteMigrations(db);

    const result = db.prepare('PRAGMA user_version').get() as { user_version: number };

    expect(result.user_version).toBe(4);
  });
});
