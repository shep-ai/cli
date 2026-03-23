import type {
  ListTablesResult,
  TableInfo,
} from '../../../../src/presentation/web/app/actions/list-tables';

const mockTables: TableInfo[] = [
  { name: 'features', rowCount: 42 },
  { name: 'repositories', rowCount: 5 },
  { name: 'settings', rowCount: 12 },
  { name: 'migrations', rowCount: 8 },
  { name: 'agent_events', rowCount: 1024 },
];

export async function listTables(): Promise<ListTablesResult> {
  return { tables: mockTables };
}
