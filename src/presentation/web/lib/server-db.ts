/**
 * Server-side database accessor for the web UI.
 *
 * Uses an opaque require() to lazily load the SQLite connection module at
 * runtime, preventing Turbopack from statically analyzing and attempting to
 * bundle the native better-sqlite3 addon. The module is listed in
 * serverExternalPackages so Node.js require() resolves it at runtime.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

// Hide the module path from Turbopack static analysis
const MODULE_PATH = '@shepai/core/infrastructure/persistence/sqlite/connection';

interface DbLike {
  prepare(sql: string): {
    all(...params: unknown[]): unknown[];
    get(...params: unknown[]): unknown;
    run(...params: unknown[]): unknown;
  };
  pragma(sql: string): unknown;
}

export async function getDb(): Promise<DbLike> {
  // Use Function constructor to create a require call that Turbopack can't statically analyze
  const loadModule = new Function('modulePath', 'return require(modulePath)') as (path: string) => {
    getSQLiteConnection: () => Promise<any>;
  };
  const { getSQLiteConnection } = loadModule(MODULE_PATH);
  return getSQLiteConnection() as Promise<DbLike>;
}
