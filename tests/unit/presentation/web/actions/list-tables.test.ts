// @vitest-environment node

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockPrepare = vi.fn();
const mockGetDb = vi.fn();

vi.mock('../../../../../src/presentation/web/lib/server-db.js', () => ({
  getDb: (...args: unknown[]) => mockGetDb(...args),
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

    mockGetDb.mockResolvedValue({ prepare: mockPrepare });

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

    mockGetDb.mockResolvedValue({ prepare: mockPrepare });

    const result = await listTables();

    expect(result.error).toBeUndefined();
    expect(mockPrepare).toHaveBeenCalledWith(expect.stringContaining("NOT LIKE 'sqlite_%'"));
    expect(result.tables).toEqual([{ name: 'features', rowCount: 10 }]);
  });

  it('returns empty array for empty database', async () => {
    mockPrepare.mockReturnValueOnce({ all: () => [] });
    mockGetDb.mockResolvedValue({ prepare: mockPrepare });

    const result = await listTables();

    expect(result.error).toBeUndefined();
    expect(result.tables).toEqual([]);
  });

  it('returns error when connection fails', async () => {
    mockGetDb.mockRejectedValue(new Error('Database not available'));

    const result = await listTables();

    expect(result.error).toBe('Database not available');
    expect(result.tables).toBeUndefined();
  });
});
