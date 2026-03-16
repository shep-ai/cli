import type { Meta, StoryObj } from '@storybook/react';
import { DatabasePageClient } from './database-page-client';
import type { TableInfo } from '@/app/actions/list-tables';
import type { GetTableRowsResult } from '@/app/actions/get-table-rows';
import type { GetTableSchemaResult } from '@/app/actions/get-table-schema';
import type { ExecuteQueryResult } from '@/app/actions/execute-query';

const mockFetchRows = async (_tableName: string, page: number): Promise<GetTableRowsResult> => ({
  columns: ['id', 'name', 'status', 'created_at'],
  rows: [
    { id: 1, name: 'auth-module', status: 'done', created_at: '2026-01-15' },
    { id: 2, name: 'payment-flow', status: 'in-progress', created_at: '2026-02-01' },
    { id: 3, name: 'dashboard', status: 'pending', created_at: '2026-02-10' },
  ],
  totalRows: 42,
  page,
  pageSize: 50,
});

const mockFetchSchema = async (_tableName: string): Promise<GetTableSchemaResult> => ({
  columns: [
    { name: 'id', type: 'INTEGER', notnull: true, defaultValue: null, primaryKey: true },
    { name: 'name', type: 'TEXT', notnull: true, defaultValue: null, primaryKey: false },
    { name: 'status', type: 'TEXT', notnull: false, defaultValue: "'pending'", primaryKey: false },
    {
      name: 'created_at',
      type: 'TEXT',
      notnull: true,
      defaultValue: 'CURRENT_TIMESTAMP',
      primaryKey: false,
    },
  ],
});

const mockRunQuery = async (sql: string): Promise<ExecuteQueryResult> => {
  if (sql.toLowerCase().includes('error')) {
    return { error: 'near "error": syntax error' };
  }
  return {
    columns: ['id', 'name'],
    rows: [
      { id: 1, name: 'result-1' },
      { id: 2, name: 'result-2' },
    ],
  };
};

const meta: Meta<typeof DatabasePageClient> = {
  title: 'Features/Database/DatabasePageClient',
  component: DatabasePageClient,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
  decorators: [
    (Story) => (
      <div style={{ height: '100vh', padding: '24px', display: 'flex', flexDirection: 'column' }}>
        <Story />
      </div>
    ),
  ],
  args: {
    fetchRows: mockFetchRows,
    fetchSchema: mockFetchSchema,
    runQuery: mockRunQuery,
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

const mockTables: TableInfo[] = [
  { name: 'features', rowCount: 42 },
  { name: 'repositories', rowCount: 5 },
  { name: 'settings', rowCount: 12 },
  { name: 'migrations', rowCount: 8 },
  { name: 'agent_events', rowCount: 1024 },
];

export const Default: Story = {
  args: {
    initialTables: mockTables,
  },
};

export const EmptyDatabase: Story = {
  args: {
    initialTables: [],
  },
};

export const SingleTable: Story = {
  args: {
    initialTables: [{ name: 'features', rowCount: 3 }],
  },
};
