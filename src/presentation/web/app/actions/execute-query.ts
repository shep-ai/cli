'use server';

import { getDb } from '@/lib/server-db';

export interface ExecuteQueryResult {
  columns?: string[];
  rows?: Record<string, unknown>[];
  error?: string;
}

/**
 * Regex pattern to detect write/destructive SQL statements.
 * Strips SQL comments and checks for disallowed keywords.
 */
const WRITE_KEYWORDS_PATTERN =
  /^\s*(INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|ATTACH|DETACH|REINDEX|VACUUM)\b/i;

/**
 * Catches CTEs that lead to write operations: WITH ... INSERT/UPDATE/DELETE
 */
const CTE_WRITE_PATTERN = /^\s*WITH\b[\s\S]*?\b(INSERT|UPDATE|DELETE)\b/i;

function stripSqlComments(sql: string): string {
  return sql
    .replace(/--[^\n]*/g, '') // single-line comments
    .replace(/\/\*[\s\S]*?\*\//g, '') // multi-line comments
    .trim();
}

function isWriteQuery(sql: string): boolean {
  const normalized = stripSqlComments(sql);
  return WRITE_KEYWORDS_PATTERN.test(normalized) || CTE_WRITE_PATTERN.test(normalized);
}

function formatCellValue(value: unknown): unknown {
  if (Buffer.isBuffer(value)) {
    return `(${value.length} bytes)`;
  }
  return value;
}

export async function executeQuery(sql: string): Promise<ExecuteQueryResult> {
  const trimmed = sql.trim();

  if (!trimmed) {
    return { error: 'Query cannot be empty' };
  }

  if (isWriteQuery(trimmed)) {
    return {
      error: 'Write operations are not allowed. Only SELECT and PRAGMA queries are permitted.',
    };
  }

  try {
    const db = await getDb();
    const rows = db.prepare(trimmed).all() as Record<string, unknown>[];

    const columns = rows.length > 0 ? Object.keys(rows[0]) : [];

    const formattedRows = rows.map((row) => {
      const formatted: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(row)) {
        formatted[key] = formatCellValue(value);
      }
      return formatted;
    });

    return { columns, rows: formattedRows };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Query execution failed';
    return { error: message };
  }
}
