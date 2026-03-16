/**
 * Server-side database accessor for the web UI.
 *
 * Resolves the better-sqlite3 Database instance from the DI container,
 * which is initialized by the CLI bootstrap or dev-server.
 */

import { resolve } from '@/lib/server-container';

export interface DbLike {
  prepare(sql: string): {
    all(...params: unknown[]): unknown[];
    get(...params: unknown[]): unknown;
    run(...params: unknown[]): unknown;
  };
  pragma(sql: string): unknown;
}

export function getDb(): DbLike {
  return resolve<DbLike>('Database');
}
