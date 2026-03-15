'use server';

import { getDb } from '@/lib/server-db';

export interface ColumnInfo {
  name: string;
  type: string;
  notnull: boolean;
  defaultValue: string | null;
  primaryKey: boolean;
}

export interface GetTableSchemaResult {
  columns?: ColumnInfo[];
  error?: string;
}

export async function getTableSchema(tableName: string): Promise<GetTableSchemaResult> {
  try {
    const db = await getDb();

    // Validate table name against sqlite_master
    const tableExists = db
      .prepare(`SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?`)
      .get(tableName) as { name: string } | undefined;

    if (!tableExists) {
      return { error: `Table "${tableName}" not found` };
    }

    const pragmaResult = db.prepare(`PRAGMA table_info("${tableName}")`).all() as {
      cid: number;
      name: string;
      type: string;
      notnull: number;
      dflt_value: string | null;
      pk: number;
    }[];

    const columns: ColumnInfo[] = pragmaResult.map((col) => ({
      name: col.name,
      type: col.type || 'TEXT',
      notnull: col.notnull === 1,
      defaultValue: col.dflt_value,
      primaryKey: col.pk > 0,
    }));

    return { columns };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch table schema';
    return { error: message };
  }
}
