import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { SqliteSaver } from '@langchain/langgraph-checkpoint-sqlite';

/**
 * Creates a SQLite-backed checkpoint saver for LangGraph state persistence.
 * Ensures the parent directory exists for file-based paths.
 *
 * @param dbPath - Path to the SQLite database file (e.g., ':memory:' or a file path)
 * @returns A SqliteSaver instance ready for use as a LangGraph checkpointer
 */
export function createCheckpointer(dbPath: string): SqliteSaver {
  if (dbPath !== ':memory:') {
    mkdirSync(dirname(dbPath), { recursive: true });
  }
  return SqliteSaver.fromConnString(dbPath);
}
