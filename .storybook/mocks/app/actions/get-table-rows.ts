import type { GetTableRowsResult } from '../../../../src/presentation/web/app/actions/get-table-rows';

export const PAGE_SIZE = 50;

const mockRows: Record<string, unknown>[] = [
  { id: 1, name: 'auth-module', status: 'done', created_at: '2026-01-15T10:30:00Z' },
  { id: 2, name: 'payment-flow', status: 'in-progress', created_at: '2026-02-01T14:00:00Z' },
  { id: 3, name: 'dashboard', status: 'pending', created_at: '2026-02-10T09:15:00Z' },
  { id: 4, name: 'api-gateway', status: 'done', created_at: '2026-03-01T11:45:00Z' },
  { id: 5, name: 'settings-page', status: 'in-progress', created_at: '2026-03-10T16:20:00Z' },
];

export async function getTableRows(_tableName: string, page = 0): Promise<GetTableRowsResult> {
  return {
    columns: ['id', 'name', 'status', 'created_at'],
    rows: mockRows,
    totalRows: 128,
    page,
    pageSize: PAGE_SIZE,
  };
}
