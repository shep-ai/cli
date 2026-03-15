// @vitest-environment node

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockPrepare = vi.fn();
const mockGetDb = vi.fn();

vi.mock('../../../../../src/presentation/web/lib/server-db.js', () => ({
  getDb: (...args: unknown[]) => mockGetDb(...args),
}));

const { executeQuery } = await import(
  '../../../../../src/presentation/web/app/actions/execute-query.js'
);

const { isWriteQuery } = await import('../../../../../src/presentation/web/lib/sql-validation.js');

function createMockDb() {
  mockGetDb.mockReturnValue({ prepare: mockPrepare });
}

describe('executeQuery server action', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('executes SELECT query and returns columns and rows', async () => {
    createMockDb();
    mockPrepare.mockReturnValueOnce({
      all: () => [
        { id: 1, name: 'feat-1' },
        { id: 2, name: 'feat-2' },
      ],
    });

    const result = await executeQuery('SELECT * FROM features');

    expect(result.error).toBeUndefined();
    expect(result.columns).toEqual(['id', 'name']);
    expect(result.rows).toHaveLength(2);
    expect(result.rows![0]).toEqual({ id: 1, name: 'feat-1' });
  });

  it('executes PRAGMA query and returns results', async () => {
    createMockDb();
    mockPrepare.mockReturnValueOnce({
      all: () => [{ name: 'id', type: 'TEXT' }],
    });

    const result = await executeQuery('PRAGMA table_info(features)');

    expect(result.error).toBeUndefined();
    expect(result.columns).toEqual(['name', 'type']);
    expect(result.rows).toHaveLength(1);
  });

  it('rejects INSERT statements', async () => {
    const result = await executeQuery("INSERT INTO features VALUES ('test')");

    expect(result.error).toContain('Write operations are not allowed');
    expect(result.rows).toBeUndefined();
    expect(mockGetDb).not.toHaveBeenCalled();
  });

  it('rejects DELETE statements', async () => {
    const result = await executeQuery('DELETE FROM features WHERE id = 1');

    expect(result.error).toContain('Write operations are not allowed');
  });

  it('rejects DROP statements', async () => {
    const result = await executeQuery('DROP TABLE features');

    expect(result.error).toContain('Write operations are not allowed');
  });

  it('rejects UPDATE statements', async () => {
    const result = await executeQuery("UPDATE features SET name = 'x' WHERE id = 1");

    expect(result.error).toContain('Write operations are not allowed');
  });

  it('rejects ALTER statements', async () => {
    const result = await executeQuery('ALTER TABLE features ADD COLUMN foo TEXT');

    expect(result.error).toContain('Write operations are not allowed');
  });

  it('rejects CREATE statements', async () => {
    const result = await executeQuery('CREATE TABLE evil (id TEXT)');

    expect(result.error).toContain('Write operations are not allowed');
  });

  it('rejects WITH ... INSERT (CTE edge case)', async () => {
    const result = await executeQuery(
      'WITH cte AS (SELECT 1) INSERT INTO features SELECT * FROM cte'
    );

    expect(result.error).toContain('Write operations are not allowed');
  });

  it('returns error for empty query', async () => {
    const result = await executeQuery('');

    expect(result.error).toBe('Query cannot be empty');
  });

  it('returns error for whitespace-only query', async () => {
    const result = await executeQuery('   ');

    expect(result.error).toBe('Query cannot be empty');
  });

  it('returns SQLite error message for syntax errors', async () => {
    createMockDb();
    mockPrepare.mockImplementationOnce(() => {
      throw new Error('near "SELEC": syntax error');
    });

    const result = await executeQuery('SELEC * FROM features');

    expect(result.error).toBe('near "SELEC": syntax error');
    expect(result.rows).toBeUndefined();
  });

  it('converts BLOB values to byte length strings', async () => {
    createMockDb();
    mockPrepare.mockReturnValueOnce({
      all: () => [{ id: 1, data: Buffer.from('binary content') }],
    });

    const result = await executeQuery('SELECT * FROM files');

    expect(result.rows![0].data).toBe('(14 bytes)');
  });

  it('returns empty columns for query with no results', async () => {
    createMockDb();
    mockPrepare.mockReturnValueOnce({ all: () => [] });

    const result = await executeQuery("SELECT * FROM features WHERE id = 'none'");

    expect(result.error).toBeUndefined();
    expect(result.columns).toEqual([]);
    expect(result.rows).toEqual([]);
  });
});

describe('isWriteQuery', () => {
  it('detects write keywords regardless of case', () => {
    expect(isWriteQuery('insert into foo values (1)')).toBe(true);
    expect(isWriteQuery('INSERT INTO foo VALUES (1)')).toBe(true);
    expect(isWriteQuery('Insert Into foo VALUES (1)')).toBe(true);
  });

  it('ignores SQL comments before keywords', () => {
    expect(isWriteQuery('-- comment\nINSERT INTO foo VALUES (1)')).toBe(true);
    expect(isWriteQuery('/* block comment */ DELETE FROM foo')).toBe(true);
  });

  it('allows SELECT queries', () => {
    expect(isWriteQuery('SELECT * FROM features')).toBe(false);
    expect(isWriteQuery('select count(*) from features')).toBe(false);
  });

  it('allows PRAGMA queries', () => {
    expect(isWriteQuery('PRAGMA table_info(features)')).toBe(false);
  });

  it('rejects ATTACH and DETACH', () => {
    expect(isWriteQuery("ATTACH DATABASE 'evil.db' AS evil")).toBe(true);
    expect(isWriteQuery('DETACH DATABASE evil')).toBe(true);
  });

  it('rejects VACUUM and REINDEX', () => {
    expect(isWriteQuery('VACUUM')).toBe(true);
    expect(isWriteQuery('REINDEX features')).toBe(true);
  });
});
