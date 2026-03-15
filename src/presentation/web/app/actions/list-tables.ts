'use server';

import { getSQLiteConnection } from '@shepai/core/infrastructure/persistence/sqlite/connection';

export interface TableInfo {
  name: string;
  rowCount: number;
}

export interface ListTablesResult {
  tables?: TableInfo[];
  error?: string;
}

export async function listTables(): Promise<ListTablesResult> {
  try {
    const db = await getSQLiteConnection();

    const tables = db
      .prepare(
        `SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name`
      )
      .all() as { name: string }[];

    const result: TableInfo[] = tables.map((t) => {
      const row = db.prepare(`SELECT COUNT(*) as count FROM "${t.name}"`).get() as {
        count: number;
      };
      return { name: t.name, rowCount: row.count };
    });

    return { tables: result };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to list tables';
    return { error: message };
  }
}
