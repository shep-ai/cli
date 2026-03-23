/**
 * Client-safe SQL validation utilities.
 * These are extracted from the execute-query server action so they can be
 * used for instant client-side feedback without a server round-trip.
 */

const WRITE_KEYWORDS_PATTERN =
  /^\s*(INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|ATTACH|DETACH|REINDEX|VACUUM)\b/i;

const CTE_WRITE_PATTERN = /^\s*WITH\b[\s\S]*?\b(INSERT|UPDATE|DELETE)\b/i;

function stripSqlComments(sql: string): string {
  return sql
    .replace(/--[^\n]*/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .trim();
}

export function isWriteQuery(sql: string): boolean {
  const normalized = stripSqlComments(sql);
  return WRITE_KEYWORDS_PATTERN.test(normalized) || CTE_WRITE_PATTERN.test(normalized);
}
