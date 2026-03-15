// @vitest-environment node

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockPrepare = vi.fn();
const mockGetSQLiteConnection = vi.fn();

vi.mock('@shepai/core/infrastructure/persistence/sqlite/connection', () => ({
  getSQLiteConnection: (...args: unknown[]) => mockGetSQLiteConnection(...args),
}));

const { listTables } = await import(
  '../../../../../src/presentation/web/app/actions/list-tables.js'
);

describe('listTables server action', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns array of table names with row counts', async () => {
    mockPrepare
      .mockReturnValueOnce({
        all: () => [{ name: 'features' }, { name: 'repositories' }, { name: 'settings' }],
      })
      .mockReturnValueOnce({ get: () => ({ count: 42 }) })
      .mockReturnValueOnce({ get: () => ({ count: 7 }) })
      .mockReturnValueOnce({ get: () => ({ count: 1 }) });

    mockGetSQLiteConnection.mockResolvedValue({ prepare: mockPrepare });

    const result = await listTables();

    expect(result.error).toBeUndefined();
    expect(result.tables).toEqual([
      { name: 'features', rowCount: 42 },
      { name: 'repositories', rowCount: 7 },
      { name: 'settings', rowCount: 1 },
    ]);
  });

  it('excludes sqlite_ prefixed tables', async () => {
    mockPrepare
      .mockReturnValueOnce({
        all: () => [{ name: 'features' }],
      })
      .mockReturnValueOnce({ get: () => ({ count: 10 }) });

    mockGetSQLiteConnection.mockResolvedValue({ prepare: mockPrepare });

    const result = await listTables();

    // The SQL query itself filters sqlite_ tables, so we verify
    // the prepare was called with the correct query
    expect(mockPrepare).toHaveBeenCalledWith(expect.stringContaining("NOT LIKE 'sqlite_%'"));
    expect(result.tables).toEqual([{ name: 'features', rowCount: 10 }]);
  });

  it('returns empty array for empty database', async () => {
    mockPrepare.mockReturnValueOnce({ all: () => [] });
    mockGetSQLiteConnection.mockResolvedValue({ prepare: mockPrepare });

    const result = await listTables();

    expect(result.error).toBeUndefined();
    expect(result.tables).toEqual([]);
  });

  it('returns error when connection fails', async () => {
    mockGetSQLiteConnection.mockRejectedValue(new Error('Database not available'));

    const result = await listTables();

    expect(result.error).toBe('Database not available');
    expect(result.tables).toBeUndefined();
  });
});
