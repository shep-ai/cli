// @vitest-environment node

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockPrepare = vi.fn();
const mockGetSQLiteConnection = vi.fn();

vi.mock('@shepai/core/infrastructure/persistence/sqlite/connection', () => ({
  getSQLiteConnection: (...args: unknown[]) => mockGetSQLiteConnection(...args),
}));

const { getTableRows } = await import(
  '../../../../../src/presentation/web/app/actions/get-table-rows.js'
);

function createMockDb() {
  mockGetSQLiteConnection.mockResolvedValue({ prepare: mockPrepare });
}

describe('getTableRows server action', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns first page of rows with columns', async () => {
    createMockDb();

    // validate table name
    mockPrepare.mockReturnValueOnce({
      get: () => ({ name: 'features' }),
    });
    // count query
    mockPrepare.mockReturnValueOnce({
      get: () => ({ count: 120 }),
    });
    // select rows
    mockPrepare.mockReturnValueOnce({
      all: () => [
        { id: 1, name: 'feat-1', status: 'active' },
        { id: 2, name: 'feat-2', status: 'done' },
      ],
    });

    const result = await getTableRows('features', 0);

    expect(result.error).toBeUndefined();
    expect(result.columns).toEqual(['id', 'name', 'status']);
    expect(result.rows).toHaveLength(2);
    expect(result.totalRows).toBe(120);
    expect(result.page).toBe(0);
    expect(result.pageSize).toBe(50);
  });

  it('returns correct offset for page 1', async () => {
    createMockDb();

    mockPrepare
      .mockReturnValueOnce({ get: () => ({ name: 'features' }) })
      .mockReturnValueOnce({ get: () => ({ count: 120 }) })
      .mockReturnValueOnce({
        all: () => [{ id: 51, name: 'feat-51' }],
      });

    const result = await getTableRows('features', 1);

    expect(result.error).toBeUndefined();
    expect(result.page).toBe(1);
    // Verify LIMIT/OFFSET query was called with correct args
    expect(mockPrepare).toHaveBeenCalledWith(expect.stringContaining('LIMIT ? OFFSET ?'));
  });

  it('returns error for invalid table name', async () => {
    createMockDb();

    // validate table name - not found
    mockPrepare.mockReturnValueOnce({
      get: () => undefined,
    });

    const result = await getTableRows('nonexistent', 0);

    expect(result.error).toBe('Table "nonexistent" not found');
    expect(result.rows).toBeUndefined();
  });

  it('converts BLOB values to byte length strings', async () => {
    createMockDb();

    mockPrepare
      .mockReturnValueOnce({ get: () => ({ name: 'files' }) })
      .mockReturnValueOnce({ get: () => ({ count: 1 }) })
      .mockReturnValueOnce({
        all: () => [{ id: 1, data: Buffer.from('hello world') }],
      });

    const result = await getTableRows('files', 0);

    expect(result.error).toBeUndefined();
    expect(result.rows![0].data).toBe('(11 bytes)');
  });

  it('returns column names from pragma for empty table', async () => {
    createMockDb();

    mockPrepare
      .mockReturnValueOnce({ get: () => ({ name: 'empty_table' }) })
      .mockReturnValueOnce({ get: () => ({ count: 0 }) })
      .mockReturnValueOnce({ all: () => [] })
      // pragma table_info fallback
      .mockReturnValueOnce({
        all: () => [{ name: 'id' }, { name: 'title' }, { name: 'created_at' }],
      });

    const result = await getTableRows('empty_table', 0);

    expect(result.error).toBeUndefined();
    expect(result.columns).toEqual(['id', 'title', 'created_at']);
    expect(result.rows).toEqual([]);
    expect(result.totalRows).toBe(0);
  });
});
