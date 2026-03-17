import type { ExecuteQueryResult } from '../../../../src/presentation/web/app/actions/execute-query';

export function isWriteQuery(sql: string): boolean {
  const normalized = sql
    .replace(/--[^\n]*/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .trim();
  return /^\s*(INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|ATTACH|DETACH|REINDEX|VACUUM)\b/i.test(
    normalized
  );
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

  return {
    columns: ['id', 'name', 'status'],
    rows: [
      { id: 1, name: 'auth-module', status: 'done' },
      { id: 2, name: 'payment-flow', status: 'in-progress' },
    ],
  };
}
