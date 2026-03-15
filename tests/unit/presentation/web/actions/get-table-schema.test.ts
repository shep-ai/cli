// @vitest-environment node

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockPrepare = vi.fn();
const mockGetDb = vi.fn();

vi.mock('../../../../../src/presentation/web/lib/server-db.js', () => ({
  getDb: (...args: unknown[]) => mockGetDb(...args),
}));

const { getTableSchema } = await import(
  '../../../../../src/presentation/web/app/actions/get-table-schema.js'
);

function createMockDb() {
  mockGetDb.mockResolvedValue({ prepare: mockPrepare });
}

describe('getTableSchema server action', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns column metadata array', async () => {
    createMockDb();

    // validate table name
    mockPrepare.mockReturnValueOnce({
      get: () => ({ name: 'features' }),
    });
    // pragma table_info
    mockPrepare.mockReturnValueOnce({
      all: () => [
        { cid: 0, name: 'id', type: 'TEXT', notnull: 1, dflt_value: null, pk: 1 },
        { cid: 1, name: 'name', type: 'TEXT', notnull: 1, dflt_value: null, pk: 0 },
        { cid: 2, name: 'status', type: 'TEXT', notnull: 0, dflt_value: "'active'", pk: 0 },
        { cid: 3, name: 'created_at', type: 'INTEGER', notnull: 0, dflt_value: null, pk: 0 },
      ],
    });

    const result = await getTableSchema('features');

    expect(result.error).toBeUndefined();
    expect(result.columns).toEqual([
      { name: 'id', type: 'TEXT', notnull: true, defaultValue: null, primaryKey: true },
      { name: 'name', type: 'TEXT', notnull: true, defaultValue: null, primaryKey: false },
      {
        name: 'status',
        type: 'TEXT',
        notnull: false,
        defaultValue: "'active'",
        primaryKey: false,
      },
      {
        name: 'created_at',
        type: 'INTEGER',
        notnull: false,
        defaultValue: null,
        primaryKey: false,
      },
    ]);
  });

  it('correctly identifies primary key columns', async () => {
    createMockDb();

    mockPrepare.mockReturnValueOnce({ get: () => ({ name: 'composite_pk' }) }).mockReturnValueOnce({
      all: () => [
        { cid: 0, name: 'user_id', type: 'TEXT', notnull: 1, dflt_value: null, pk: 1 },
        { cid: 1, name: 'role_id', type: 'TEXT', notnull: 1, dflt_value: null, pk: 2 },
        { cid: 2, name: 'granted_at', type: 'INTEGER', notnull: 0, dflt_value: null, pk: 0 },
      ],
    });

    const result = await getTableSchema('composite_pk');

    expect(result.columns![0].primaryKey).toBe(true);
    expect(result.columns![1].primaryKey).toBe(true);
    expect(result.columns![2].primaryKey).toBe(false);
  });

  it('returns error for invalid table name', async () => {
    createMockDb();

    mockPrepare.mockReturnValueOnce({
      get: () => undefined,
    });

    const result = await getTableSchema('nonexistent');

    expect(result.error).toBe('Table "nonexistent" not found');
    expect(result.columns).toBeUndefined();
  });

  it('defaults empty type to TEXT', async () => {
    createMockDb();

    mockPrepare.mockReturnValueOnce({ get: () => ({ name: 'loose_table' }) }).mockReturnValueOnce({
      all: () => [{ cid: 0, name: 'value', type: '', notnull: 0, dflt_value: null, pk: 0 }],
    });

    const result = await getTableSchema('loose_table');

    expect(result.columns![0].type).toBe('TEXT');
  });
});
