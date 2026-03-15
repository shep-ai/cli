'use server';

import { getDb } from '@/lib/server-db';

const PAGE_SIZE = 50;

export interface GetTableRowsResult {
  columns?: string[];
  rows?: Record<string, unknown>[];
  totalRows?: number;
  page?: number;
  pageSize?: number;
  error?: string;
}

function formatCellValue(value: unknown): unknown {
  if (Buffer.isBuffer(value)) {
    return `(${value.length} bytes)`;
  }
  return value;
}

export async function getTableRows(tableName: string, page = 0): Promise<GetTableRowsResult> {
  try {
    const db = getDb();

    // Validate table name against sqlite_master (prevents SQL injection)
    const tableExists = db
      .prepare(`SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?`)
      .get(tableName) as { name: string } | undefined;

    if (!tableExists) {
      return { error: `Table "${tableName}" not found` };
    }

    const countRow = db.prepare(`SELECT COUNT(*) as count FROM "${tableName}"`).get() as {
      count: number;
    };
    const totalRows = countRow.count;

    const offset = page * PAGE_SIZE;
    const rows = db
      .prepare(`SELECT * FROM "${tableName}" LIMIT ? OFFSET ?`)
      .all(PAGE_SIZE, offset) as Record<string, unknown>[];

    // Get column names from first row or from pragma if empty
    let columns: string[];
    if (rows.length > 0) {
      columns = Object.keys(rows[0]);
    } else {
      const pragmaResult = db.prepare(`PRAGMA table_info("${tableName}")`).all() as {
        name: string;
      }[];
      columns = pragmaResult.map((c) => c.name);
    }

    // Format BLOB values
    const formattedRows = rows.map((row) => {
      const formatted: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(row)) {
        formatted[key] = formatCellValue(value);
      }
      return formatted;
    });

    return {
      columns,
      rows: formattedRows,
      totalRows,
      page,
      pageSize: PAGE_SIZE,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch table rows';
    return { error: message };
  }
}
