import { SqliteSaver } from '@langchain/langgraph-checkpoint-sqlite';

/**
 * Creates a SQLite-backed checkpoint saver for LangGraph state persistence.
 *
 * @param dbPath - Path to the SQLite database file (e.g., ':memory:' or a file path)
 * @returns A SqliteSaver instance ready for use as a LangGraph checkpointer
 */
export function createCheckpointer(dbPath: string): SqliteSaver {
  return SqliteSaver.fromConnString(dbPath);
}
