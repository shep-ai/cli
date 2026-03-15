import type {
  GetTableSchemaResult,
  ColumnInfo,
} from '../../../../src/presentation/web/app/actions/get-table-schema';

const mockColumns: ColumnInfo[] = [
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
];

export async function getTableSchema(_tableName: string): Promise<GetTableSchemaResult> {
  return { columns: mockColumns };
}
